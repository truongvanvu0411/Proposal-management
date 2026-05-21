import { Router } from 'express';
import { OrderStatus, OrderType, ProjectProductDeliveryMethod, ProjectStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import type { AppConfig, DatabaseClient } from '../types';
import { requireAuth, requireRole } from '../auth/middleware';
import { asyncHandler } from '../shared/asyncHandler';
import { ApiError } from '../shared/errors';
import { writeAuditLog } from '../shared/audit';
import { toOrderRequestDto, toProjectDto } from '../shared/dto';
import { validateBody } from '../shared/validation';

const manageRoles = [UserRole.ADMIN, UserRole.PRODUCT_MANAGER];

const projectProductSchema = z.object({
  productId: z.string().min(1),
  proposalComment: z.string().optional().default(''),
  recommendationReasons: z.array(z.object({
    title: z.string().max(100).optional().default(''),
    detail: z.string().max(500).optional().default(''),
  })).max(3).optional(),
  cost: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  displayOrder: z.number().int().nonnegative().optional(),
  isAdopted: z.boolean().default(false),
  companyProductCode: z.string().max(100).optional().or(z.literal('')),
  adoptionDate: z.string().date().optional().or(z.literal('')),
  orderPlannedDate: z.string().date().optional().or(z.literal('')),
  deliveryMethod: z.nativeEnum(ProjectProductDeliveryMethod).default(ProjectProductDeliveryMethod.WAREHOUSE),
  allowPublish: z.boolean().default(false),
  allowOrder: z.boolean().default(false),
});

const projectSchema = z.object({
  title: z.string().min(1).max(250),
  proposalBackground: z.string().max(2000).optional().or(z.literal('')),
  recommendationPoints: z.array(z.string().max(300)).max(3).optional(),
  remarks: z.string().max(1000).optional().or(z.literal('')),
  clientId: z.string().min(1),
  assignedSalesUserId: z.string().min(1).optional().or(z.literal('')),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.DRAFT),
  products: z.array(projectProductSchema).default([]),
});

const orderStatusUpdateSchema = z.object({
  status: z.enum([OrderStatus.SHIPPED, OrderStatus.RECEIVED]),
});

export function createProjectsRouter(db: DatabaseClient, config: AppConfig) {
  const router = Router();
  router.use(requireAuth(config));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const supplierId = req.user?.role === UserRole.SUPPLIER ? req.user.supplierId : undefined;
      if (req.user?.role === UserRole.SUPPLIER && !supplierId) {
        throw new ApiError(403, 'Supplier user is not linked to a supplier', 'SUPPLIER_NOT_LINKED');
      }
      if (req.user?.role === UserRole.SUPPLIER) {
        const projects = await db.project.findMany({
          where: {
            deletedAt: null,
            status: ProjectStatus.ADOPTED,
            products: {
              some: {
                isAdopted: true,
                product: {
                  supplierId,
                },
              },
            },
          },
          include: createProjectInclude(supplierId),
          orderBy: { updatedAt: 'desc' },
        });
        res.json({ projects: projects.map((project) => toProjectDto(project, { maskFinancials: true })) });
        return;
      }
      const projects = await db.project.findMany({
        where: {
          deletedAt: null,
          ...(req.user?.role === UserRole.SALES ? { assignedSalesUserId: req.user.id } : {}),
        },
        include: createProjectInclude(),
        orderBy: { createdAt: 'desc' },
      });
      res.json({ projects: projects.map(toProjectDto) });
    }),
  );

  router.post(
    '/',
    requireRole(manageRoles),
    validateBody(projectSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof projectSchema>;
      await assertAssignedSalesUser(db, body.assignedSalesUserId);
      await assertProjectProductsCanBeProposed(db, body.products);
      const totals = calculateTotals(body.products);
      const project = await db.project.create({
        data: {
          title: body.title,
          proposalBackground: body.proposalBackground || null,
          recommendationPoints: normalizeTextArray(body.recommendationPoints),
          remarks: body.remarks || null,
          clientId: body.clientId,
          assignedSalesUserId: body.assignedSalesUserId || null,
          status: body.status,
          totalRevenue: totals.totalRevenue,
          totalProfit: totals.totalProfit,
          products: {
            create: body.products.map((product) => ({
              productId: product.productId,
              proposalComment: product.proposalComment,
              recommendationReasons: normalizeRecommendationReasons(product.recommendationReasons),
              cost: product.cost,
              sellingPrice: product.sellingPrice,
              quantity: product.quantity,
              displayOrder: product.displayOrder ?? 0,
              isAdopted: product.isAdopted,
              companyProductCode: product.companyProductCode || null,
              adoptionDate: product.adoptionDate ? new Date(`${product.adoptionDate}T00:00:00.000Z`) : null,
              orderPlannedDate: product.orderPlannedDate ? new Date(`${product.orderPlannedDate}T00:00:00.000Z`) : null,
              deliveryMethod: product.deliveryMethod,
              allowPublish: product.allowPublish,
              allowOrder: product.allowOrder,
            })),
          },
        },
        include: createProjectInclude(),
      });
      await ensureOrderRequestsForProject(db, project.id, body.products, req.user?.id);
      const hydratedProject = await db.project.findUnique({
        where: { id: project.id },
        include: createProjectInclude(),
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'PROJECT_CREATE',
        entityType: 'Project',
        entityId: project.id,
      });
      res.status(201).json({ project: toProjectDto(hydratedProject ?? project) });
    }),
  );

  router.patch(
    '/:projectId/orders/:orderId/status',
    requireRole([UserRole.ADMIN, UserRole.PRODUCT_MANAGER, UserRole.SUPPLIER]),
    validateBody(orderStatusUpdateSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof orderStatusUpdateSchema>;
      const order = await db.orderRequest.findUnique({
        where: { id: req.params.orderId },
      });
      if (!order || order.projectId !== req.params.projectId) {
        throw new ApiError(404, 'Order request not found', 'ORDER_REQUEST_NOT_FOUND');
      }

      const project = await db.project.findUnique({
        where: { id: req.params.projectId },
      });
      if (!project || project.deletedAt) {
        throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
      }

      if (req.user?.role === UserRole.SUPPLIER) {
        if (!req.user.supplierId || order.supplierId !== req.user.supplierId) {
          throw new ApiError(403, 'Supplier cannot update this order request', 'ORDER_REQUEST_FORBIDDEN');
        }
        if (body.status !== OrderStatus.SHIPPED) {
          throw new ApiError(400, 'Supplier can only mark orders as shipped', 'INVALID_ORDER_STATUS_TRANSITION');
        }
        if (project.status !== ProjectStatus.ADOPTED) {
          throw new ApiError(400, 'Orders can be shipped only after the project is adopted', 'PROJECT_NOT_ADOPTED');
        }
        if ([OrderStatus.RECEIVED, OrderStatus.CANCELLED].includes(order.status)) {
          throw new ApiError(400, 'Order status cannot be changed from its current state', 'INVALID_ORDER_STATUS_TRANSITION');
        }
      } else {
        if (body.status !== OrderStatus.RECEIVED || order.status !== OrderStatus.SHIPPED) {
          throw new ApiError(400, 'Product manager can mark only shipped orders as received', 'INVALID_ORDER_STATUS_TRANSITION');
        }
      }

      const updatedOrder = await db.orderRequest.update({
        where: { id: order.id },
        data: { status: body.status },
      });
      await db.projectProduct.updateMany({
        where: {
          projectId: order.projectId,
          productId: order.productId,
        },
        data: { orderStatus: body.status },
      });
      await notifyOrderStatusChange(db, {
        actorId: req.user?.id,
        order: updatedOrder,
        project,
        status: body.status,
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'ORDER_STATUS_UPDATE',
        entityType: 'OrderRequest',
        entityId: order.id,
      });
      res.json({ orderRequest: toOrderRequestDto(updatedOrder) });
    }),
  );

  router.patch(
    '/:id',
    requireRole(manageRoles),
    validateBody(projectSchema.partial()),
    asyncHandler(async (req, res) => {
      const body = req.body as Partial<z.infer<typeof projectSchema>>;
      const current = await db.project.findUnique({
        where: { id: req.params.id },
        include: { products: true },
      });
      if (!current || current.deletedAt) {
        throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
      }
      if (body.assignedSalesUserId !== undefined) {
        await assertAssignedSalesUser(db, body.assignedSalesUserId);
      }
      if (body.products) {
        await assertProjectProductsCanBeProposed(
          db,
          body.products,
          new Set((current.products ?? []).map((product: any) => product.productId)),
        );
      }

      const totals = body.products ? calculateTotals(body.products) : null;
      const project = await db.project.update({
        where: { id: req.params.id },
        data: {
          title: body.title,
          proposalBackground: body.proposalBackground === '' ? null : body.proposalBackground,
          recommendationPoints: body.recommendationPoints ? normalizeTextArray(body.recommendationPoints) : undefined,
          remarks: body.remarks === '' ? null : body.remarks,
          clientId: body.clientId,
          assignedSalesUserId: body.assignedSalesUserId === '' ? null : body.assignedSalesUserId,
          status: body.status,
          totalRevenue: totals?.totalRevenue,
          totalProfit: totals?.totalProfit,
          products: body.products
            ? {
                deleteMany: {},
                create: body.products.map((product) => ({
                  productId: product.productId,
                  proposalComment: product.proposalComment,
                  recommendationReasons: normalizeRecommendationReasons(product.recommendationReasons),
                  cost: product.cost,
                  sellingPrice: product.sellingPrice,
                  quantity: product.quantity,
                  displayOrder: product.displayOrder ?? 0,
                  isAdopted: product.isAdopted,
                  companyProductCode: product.companyProductCode || null,
                  adoptionDate: product.adoptionDate ? new Date(`${product.adoptionDate}T00:00:00.000Z`) : null,
                  orderPlannedDate: product.orderPlannedDate ? new Date(`${product.orderPlannedDate}T00:00:00.000Z`) : null,
                  deliveryMethod: product.deliveryMethod,
                  allowPublish: product.allowPublish,
                  allowOrder: product.allowOrder,
                })),
              }
            : undefined,
        },
        include: createProjectInclude(),
      });
      if (body.products) {
        await notifyProductAdoptionChanges(db, {
          actorId: req.user?.id,
          project: {
            id: project.id,
            title: project.title,
            assignedSalesUserId: project.assignedSalesUserId,
            status: project.status,
          },
          beforeProducts: current.products ?? [],
          nextProducts: body.products,
        });
        await ensureOrderRequestsForProject(db, project.id, body.products, req.user?.id);
      }
      const hydratedProject = await db.project.findUnique({
        where: { id: project.id },
        include: createProjectInclude(),
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'PROJECT_UPDATE',
        entityType: 'Project',
        entityId: project.id,
      });
      res.json({ project: toProjectDto(hydratedProject ?? project) });
    }),
  );

  router.delete(
    '/:id',
    requireRole(manageRoles),
    asyncHandler(async (req, res) => {
      await db.project.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date() },
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'PROJECT_DELETE',
        entityType: 'Project',
        entityId: req.params.id,
      });
      res.status(204).send();
    }),
  );

  return router;
}

async function notifyOrderStatusChange(
  db: DatabaseClient,
  input: {
    actorId?: string;
    order: any;
    project: any;
    status: OrderStatus;
  },
) {
  const recipientIds = await resolveOrderNotificationRecipients(db, input);
  if (!recipientIds.length) return;

  const title = input.status === OrderStatus.SHIPPED ? '商品が発送されました' : '商品が受取済みになりました';
  const message =
    input.status === OrderStatus.SHIPPED
      ? `${input.project.title} / ${input.order.productName} が発送済みになりました。`
      : `${input.project.title} / ${input.order.productName} が受取済みになりました。`;

  await Promise.all(
    recipientIds.map((userId) =>
      db.notification.create({
        data: {
          userId,
          title,
          message,
          type: input.status === OrderStatus.SHIPPED ? 'ORDER_SHIPPED' : 'ORDER_RECEIVED',
          projectId: input.project.id,
          orderId: input.order.id,
          productId: input.order.productId,
        },
      }),
    ),
  );
}

async function notifyOrderRequestCreated(
  db: DatabaseClient,
  input: {
    actorId?: string;
    order: any;
    project: any;
  },
) {
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      role: UserRole.SUPPLIER,
      supplierId: input.order.supplierId,
    },
  });
  const recipients = users
    .map((user: { id: string }) => user.id)
    .filter((userId: string) => userId !== input.actorId);
  if (!recipients.length) return;

  await Promise.all(
    recipients.map((userId: string) =>
      db.notification.create({
        data: {
          userId,
          title: '発注依頼が届きました',
          message: `${input.project.title} / ${input.order.productName} の発注依頼が作成されました。`,
          type: 'ORDER_REQUESTED',
          projectId: input.project.id,
          orderId: input.order.id,
          productId: input.order.productId,
        },
      }),
    ),
  );
}

async function notifyProductAdoptionChanges(
  db: DatabaseClient,
  input: {
    actorId?: string;
    project: { id: string; title: string; assignedSalesUserId?: string | null; status: ProjectStatus };
    beforeProducts: Array<{ productId: string; isAdopted: boolean }>;
    nextProducts: Array<z.infer<typeof projectProductSchema>>;
  },
) {
  if (input.project.status !== ProjectStatus.ADOPTED) {
    return;
  }
  const beforeMap = new Map(input.beforeProducts.map((product) => [product.productId, product.isAdopted]));
  const newlyAdopted = input.nextProducts.filter((product) => product.isAdopted && !beforeMap.get(product.productId));
  if (!newlyAdopted.length) {
    return;
  }

  const productMasters = await db.product.findMany({
    where: { id: { in: newlyAdopted.map((product) => product.productId) } },
    select: { id: true, name: true, supplierId: true },
  });
  const productById = new Map<string, any>(productMasters.map((product: any) => [product.id, product]));
  const users = await db.user.findMany({ where: { deletedAt: null } });

  for (const projectProduct of newlyAdopted) {
    const product = productById.get(projectProduct.productId);
    if (!product) continue;
    const recipientIds = new Set<string>();
    for (const user of users) {
      const isInternal =
        user.role === UserRole.ADMIN ||
        user.role === UserRole.PRODUCT_MANAGER ||
        (input.project.assignedSalesUserId && user.id === input.project.assignedSalesUserId);
      const isSupplier = user.role === UserRole.SUPPLIER && user.supplierId === product.supplierId;
      if (isInternal || isSupplier) {
        recipientIds.add(user.id);
      }
    }
    if (input.actorId) {
      recipientIds.delete(input.actorId);
    }
    await Promise.all(
      Array.from(recipientIds).map((userId) =>
        db.notification.create({
          data: {
            userId,
            title: '採用商品が登録されました',
            message: `${input.project.title} / ${product.name} が採用商品として登録されました。`,
            type: 'PRODUCT_ADOPTED',
            projectId: input.project.id,
            productId: product.id,
          },
        }),
      ),
    );
  }
}

async function resolveOrderNotificationRecipients(
  db: DatabaseClient,
  input: {
    actorId?: string;
    order: any;
    project: any;
    status: OrderStatus;
  },
) {
  const users = await db.user.findMany({ where: { deletedAt: null } });
  const ids = new Set<string>();
  for (const user of users) {
    const isInternalStakeholder =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.PRODUCT_MANAGER ||
      (input.project.assignedSalesUserId && user.id === input.project.assignedSalesUserId);
    const isSupplierStakeholder = user.role === UserRole.SUPPLIER && user.supplierId === input.order.supplierId;
    if (input.status === OrderStatus.SHIPPED && isInternalStakeholder) {
      ids.add(user.id);
    }
    if (input.status === OrderStatus.RECEIVED && isSupplierStakeholder) {
      ids.add(user.id);
    }
  }
  if (input.actorId) {
    ids.delete(input.actorId);
  }
  return Array.from(ids);
}

function createProjectInclude(supplierId?: string) {
  return {
    client: true,
    assignedSalesUser: true,
    products: supplierId
      ? {
          where: {
            product: { supplierId },
            isAdopted: true,
          },
        }
      : true,
    orderRequests: supplierId
      ? {
          where: { supplierId },
        }
      : true,
  };
}

async function assertAssignedSalesUser(db: DatabaseClient, userId?: string) {
  if (!userId) return;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt || user.role !== UserRole.SALES) {
    throw new ApiError(400, 'Assigned user must be an active sales user', 'INVALID_ASSIGNED_SALES_USER');
  }
}

async function assertProjectProductsCanBeProposed(
  db: DatabaseClient,
  products: Array<z.infer<typeof projectProductSchema>>,
  existingProductIds = new Set<string>(),
) {
  const productIds = products
    .map((product) => product.productId)
    .filter((productId) => !existingProductIds.has(productId));
  if (!productIds.length) return;
  const today = new Date().toISOString().slice(0, 10);
  const productMasters = await db.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: { id: true, name: true, availableFrom: true, availableTo: true },
  });
  const productById = new Map<string, any>(productMasters.map((product: any) => [product.id, product]));
  for (const productId of productIds) {
    const product = productById.get(productId);
    if (!product) {
      throw new ApiError(400, 'Selected product is not available', 'PRODUCT_NOT_AVAILABLE_FOR_PROPOSAL');
    }
    const availableFrom = product.availableFrom ? new Date(product.availableFrom).toISOString().slice(0, 10) : '';
    const availableTo = product.availableTo ? new Date(product.availableTo).toISOString().slice(0, 10) : '';
    if ((availableFrom && availableFrom > today) || (availableTo && availableTo < today)) {
      throw new ApiError(400, `${product.name} is outside the proposal availability period`, 'PRODUCT_EXPIRED_FOR_PROPOSAL');
    }
  }
}

function calculateTotals(products: Array<z.infer<typeof projectProductSchema>>) {
  return products.reduce(
    (totals, product) => ({
      totalRevenue: totals.totalRevenue + product.sellingPrice * product.quantity,
      totalProfit:
        totals.totalProfit + (product.sellingPrice - product.cost) * product.quantity,
    }),
    { totalRevenue: 0, totalProfit: 0 },
  );
}

function normalizeTextArray(values?: string[]) {
  const normalized = values?.map((value) => value.trim()).filter(Boolean) ?? [];
  return normalized.length ? normalized : undefined;
}

function normalizeRecommendationReasons(
  values?: Array<{ title?: string; detail?: string }>,
) {
  const normalized =
    values
      ?.map((value) => ({
        title: value.title?.trim() ?? '',
        detail: value.detail?.trim() ?? '',
      }))
      .filter((value) => value.title || value.detail) ?? [];
  return normalized.length ? normalized : undefined;
}

async function ensureOrderRequestsForProject(
  db: DatabaseClient,
  projectId: string,
  products: Array<z.infer<typeof projectProductSchema>>,
  actorId?: string,
) {
  const existingOrders = await db.orderRequest.findMany({ where: { projectId } });
  const existingProductIds = new Set(existingOrders.map((order: { productId: string }) => order.productId));
  const orderableProducts = products.filter((product) => product.isAdopted && product.allowOrder);
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.status !== ProjectStatus.ADOPTED) {
    return;
  }

  for (const projectProduct of orderableProducts) {
    if (existingProductIds.has(projectProduct.productId)) {
      continue;
    }
    const product = await db.product.findUnique({ where: { id: projectProduct.productId } });
    if (!product) {
      continue;
    }
    const order = await db.orderRequest.create({
      data: {
        projectId,
        productId: projectProduct.productId,
        productName: product.name,
        supplierId: product.supplierId,
        quantity: projectProduct.quantity,
        deliveryDate: projectProduct.orderPlannedDate
          ? new Date(`${projectProduct.orderPlannedDate}T00:00:00.000Z`)
          : new Date(),
        deliveryLocation: '未定',
        status: OrderStatus.REQUESTED,
        orderType: OrderType.NEW,
      },
    });
    if (project) {
      await notifyOrderRequestCreated(db, {
        actorId,
        order,
        project,
      });
    }
  }
}
