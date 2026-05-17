import { Router, type RequestHandler } from 'express';
import { ChangeRequestStatus, ProductStatus, ProductType, UserRole } from '@prisma/client';
import crypto from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import type { AppConfig, DatabaseClient, StorageService } from '../types';
import { requireAuth, requireRole } from '../auth/middleware';
import { asyncHandler } from '../shared/asyncHandler';
import { ApiError } from '../shared/errors';
import { writeAuditLog } from '../shared/audit';
import { toProductDto } from '../shared/dto';
import { validateBody } from '../shared/validation';

const manageProductRoles = [UserRole.ADMIN, UserRole.SUPPLIER];
const imageRoles = [UserRole.ADMIN, UserRole.SUPPLIER];
const maxImagesPerProduct = 10;
const maxImageBytes = 15 * 1024 * 1024;
const minImageDimension = 300;
const maxImageDimension = 8000;
const normalizedImageMimeType = 'image/jpeg';
const normalizedImageExtension = 'jpg';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxImageBytes,
    files: maxImagesPerProduct,
  },
});

const productSchema = z.object({
  name: z.string().min(1).max(250),
  description: z.string().min(1),
  modelNumber: z.string().max(100).optional().or(z.literal('')),
  features: z.array(z.string().max(300)).max(3).optional(),
  categoryName: z.string().min(1).max(150),
  janCode: z.string().min(1).max(50),
  productType: z.nativeEnum(ProductType).default(ProductType.WAREHOUSE),
  cost: z.number().nonnegative(),
  listPrice: z.number().nonnegative().optional(),
  minLot: z.number().int().positive().default(1),
  leadTime: z.string().min(1).max(100),
  supplierId: z.string().min(1).optional().or(z.literal('')),
  status: z.nativeEnum(ProductStatus).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  remarks: z.string().optional(),
});

const orderSchema = z.object({
  imageIds: z.array(z.string().min(1)).min(1).max(maxImagesPerProduct),
});
const janCodeAvailabilitySchema = z.object({
  janCode: z.string().min(1).max(50),
  excludeProductId: z.string().optional(),
});

export function createProductsRouter(db: DatabaseClient, config: AppConfig, storage?: StorageService) {
  const router = Router();
  router.use(requireAuth(config));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const where =
        req.user?.role === UserRole.SUPPLIER
          ? { deletedAt: null, supplierId: req.user.supplierId ?? '__no_supplier__' }
          : { deletedAt: null };
      const products = await db.product.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
      });
      res.json({ products: await Promise.all(products.map((product) => toProductDtoWithImages(product, storage))) });
    }),
  );

  router.get(
    '/jan-code-availability',
    asyncHandler(async (req, res) => {
      const query = janCodeAvailabilitySchema.parse(req.query);
      const product = await db.product.findFirst({
        where: {
          janCode: query.janCode,
          ...(query.excludeProductId ? { id: { not: query.excludeProductId } } : {}),
        },
        select: {
          id: true,
          name: true,
          janCode: true,
          deletedAt: true,
        },
      });

      res.json({
        available: !product,
        product: product
          ? {
              id: product.id,
              name: product.name,
              janCode: product.janCode,
              deleted: Boolean(product.deletedAt),
            }
          : undefined,
      });
    }),
  );

  router.post(
    '/',
    requireRole(manageProductRoles),
    validateBody(productSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof productSchema>;
      const supplierId = resolveWritableSupplierId(req, body.supplierId);
      const listPrice = resolveWritableListPrice(req, body.cost, body.listPrice);
      await assertSupplierExists(db, supplierId);
      const category = await upsertCategory(db, body.categoryName);
      const product = await db.product.create({
        data: {
          name: body.name,
          description: body.description,
          modelNumber: body.modelNumber || null,
          features: normalizeTextArray(body.features),
          categoryId: category.id,
          janCode: body.janCode,
          productType: body.productType,
          cost: body.cost,
          listPrice,
          minLot: body.minLot,
          leadTime: body.leadTime,
          supplierId,
          status: body.status ?? ProductStatus.ACTIVE,
          imageUrl: body.imageUrl || null,
          remarks: body.remarks,
          versions: {
            create: {
              version: 1,
              name: body.name,
              categoryName: body.categoryName,
              janCode: body.janCode,
              modelNumber: body.modelNumber || null,
              features: normalizeTextArray(body.features),
              cost: body.cost,
              listPrice,
              minLot: body.minLot,
              leadTime: body.leadTime,
              description: body.description,
              updatedBy: req.user?.id,
            },
          },
        },
        include,
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'PRODUCT_CREATE',
        entityType: 'Product',
        entityId: product.id,
      });
      res.status(201).json({ product: await toProductDtoWithImages(product, storage) });
    }),
  );

  router.patch(
    '/:id',
    requireRole(manageProductRoles),
    validateBody(productSchema.partial()),
    asyncHandler(async (req, res) => {
      const body = req.body as Partial<z.infer<typeof productSchema>>;
      const current = await db.product.findUnique({
        where: { id: req.params.id },
        include,
      });
      if (!current || current.deletedAt) {
        throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
      }
      assertCanManageProduct(req, current);

      const supplierId = req.user?.role === UserRole.SUPPLIER ? current.supplierId : body.supplierId || undefined;
      const nextCost = body.cost ?? Number(current.cost);
      const nextListPrice = resolveWritableListPrice(req, nextCost, body.listPrice ?? Number(current.listPrice));
      if (supplierId) {
        await assertSupplierExists(db, supplierId);
      }
      const beforeSnapshot = buildProductSnapshot(current);
      const afterSnapshot = buildProductSnapshot(current, {
        ...body,
        supplierId: supplierId ?? current.supplierId,
        cost: nextCost,
        listPrice: nextListPrice,
      });
      const changedFields = getChangedProductFields(beforeSnapshot, afterSnapshot);
      if (changedFields.length) {
        await upsertPendingProductChange(db, current, req, afterSnapshot, changedFields);
      }
      const product = await db.product.update({
        where: { id: req.params.id },
        data: {
          status: changedFields.length ? ProductStatus.PENDING_APPROVAL : current.status,
        },
        include,
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'PRODUCT_UPDATE_REQUEST',
        entityType: 'Product',
        entityId: product.id,
      });
      res.json({ product: await toProductDtoWithImages(product, storage) });
    }),
  );

  router.delete(
    '/:id',
    requireRole(manageProductRoles),
    asyncHandler(async (req, res) => {
      const current = await db.product.findUnique({ where: { id: req.params.id } });
      if (!current || current.deletedAt) {
        throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
      }
      assertCanManageProduct(req, current);
      await db.product.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date() },
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'PRODUCT_DELETE',
        entityType: 'Product',
        entityId: req.params.id,
      });
      res.status(204).send();
    }),
  );

  router.get(
    '/:id/images',
    requireRole(imageRoles),
    asyncHandler(async (req, res) => {
      const product = await getProductForImageWrite(db, req.params.id);
      assertCanManageProduct(req, product);
      res.json({ images: await getProductImages(db, storage, req.params.id) });
    }),
  );

  router.post(
    '/:id/images',
    requireRole(imageRoles),
    handleImageUpload,
    asyncHandler(async (req, res) => {
      if (!storage) {
        throw new ApiError(500, 'Storage service is unavailable', 'STORAGE_UNAVAILABLE');
      }
      const product = await getProductForImageWrite(db, req.params.id);
      assertCanManageProduct(req, product);
      const files = (req.files ?? []) as Express.Multer.File[];
      if (!files.length) {
        throw new ApiError(400, 'At least one image is required', 'IMAGE_REQUIRED');
      }
      const pendingChange = await getPendingProductChange(db, product.id);
      const currentImageChanges = getImageChanges(pendingChange);
      const pendingAddCount = currentImageChanges.filter((change) => change.type === 'ADD').length;
      const pendingDeleteCount = currentImageChanges.filter((change) => change.type === 'DELETE').length;
      const existingCount = await db.productImage.count({ where: { productId: product.id } });
      if (existingCount + pendingAddCount - pendingDeleteCount + files.length > maxImagesPerProduct) {
        throw new ApiError(400, 'This product already has too many images', 'PRODUCT_IMAGE_LIMIT_EXCEEDED');
      }

      const accepted = [];
      const rejected = [];
      const acceptedChanges = [];
      let nextSortOrder = existingCount + pendingAddCount;
      for (const file of files) {
        try {
          const normalized = await normalizeProductImage(file);
          const objectKey = buildProductImageObjectKey(product.id, file.originalname);
          await storage.putObject({
            objectKey,
            body: normalized.buffer,
            contentType: normalizedImageMimeType,
          });
          const savedFile = await db.file.create({
            data: {
              bucket: config.s3Bucket,
              objectKey,
              originalName: file.originalname,
              mimeType: normalizedImageMimeType,
              sizeBytes: normalized.buffer.length,
              checksum: sha256(normalized.buffer),
              status: 'READY',
              ownerType: 'PRODUCT',
              ownerId: product.id,
              purpose: 'PRODUCT_IMAGE_PENDING',
              uploadedById: req.user?.id,
            },
          });
          const imageChange = {
            type: 'ADD',
            fileId: savedFile.id,
            objectKey: savedFile.objectKey,
            sortOrder: nextSortOrder,
            originalName: savedFile.originalName,
            mimeType: savedFile.mimeType,
            sizeBytes: savedFile.sizeBytes,
            warnings: normalized.warnings,
          };
          nextSortOrder += 1;
          await writeAuditLog(db, {
            actorId: req.user?.id,
            action: 'PRODUCT_IMAGE_UPLOAD_REQUEST',
            entityType: 'Product',
            entityId: product.id,
            metadata: {
              productId: product.id,
              fileId: savedFile.id,
              width: normalized.width,
              height: normalized.height,
              sizeBytes: normalized.buffer.length,
              warnings: normalized.warnings,
            },
          });
          acceptedChanges.push(imageChange);
          accepted.push(await toPendingProductImageDto(product.id, savedFile, imageChange.sortOrder, storage, normalized.warnings));
        } catch (error) {
          if (error instanceof ApiError) {
            rejected.push({
              fileName: file.originalname,
              code: error.code,
              message: error.message,
            });
          } else {
            throw error;
          }
        }
      }

      if (!accepted.length) {
        const firstRejected = rejected[0];
        throw new ApiError(
          400,
          firstRejected?.message ?? 'No images were uploaded.',
          firstRejected?.code ?? 'IMAGE_UPLOAD_FAILED',
          { rejected },
        );
      }

      await upsertPendingProductChange(db, product, req, undefined, undefined, acceptedChanges);
      await db.product.update({
        where: { id: product.id },
        data: { status: ProductStatus.PENDING_APPROVAL },
      });
      res.status(201).json({ images: accepted, rejected });
    }),
  );

  router.patch(
    '/:id/images/order',
    requireRole(imageRoles),
    validateBody(orderSchema),
    asyncHandler(async (req, res) => {
      const product = await getProductForImageWrite(db, req.params.id);
      assertCanManageProduct(req, product);
      const body = req.body as z.infer<typeof orderSchema>;
      const images = await db.productImage.findMany({ where: { productId: product.id } });
      const existingIds = new Set(images.map((image: any) => image.id));
      if (body.imageIds.length !== images.length || body.imageIds.some((id) => !existingIds.has(id))) {
        throw new ApiError(400, 'Image order must include every product image exactly once', 'INVALID_IMAGE_ORDER');
      }
      const previousOrder = images
        .slice()
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
        .map((image: any) => image.id);
      await upsertPendingProductChange(db, product, req, undefined, undefined, [
        {
          type: 'REORDER',
          previousOrder,
          nextOrder: body.imageIds,
        },
      ]);
      await db.product.update({
        where: { id: product.id },
        data: { status: ProductStatus.PENDING_APPROVAL },
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'PRODUCT_IMAGE_REORDER_REQUEST',
        entityType: 'Product',
        entityId: product.id,
        metadata: { productId: product.id, imageIds: body.imageIds },
      });
      res.json({ images: await getProductImages(db, storage, product.id) });
    }),
  );

  router.delete(
    '/:id/images/:imageId',
    requireRole(imageRoles),
    asyncHandler(async (req, res) => {
      const product = await getProductForImageWrite(db, req.params.id);
      assertCanManageProduct(req, product);
      const image = await db.productImage.findUnique({
        where: { id: req.params.imageId },
        include: { file: true },
      });
      if (!image || image.productId !== product.id) {
        throw new ApiError(404, 'Product image not found', 'PRODUCT_IMAGE_NOT_FOUND');
      }
      await upsertPendingProductChange(db, product, req, undefined, undefined, [
        {
          type: 'DELETE',
          imageId: image.id,
          fileId: image.fileId,
          objectKey: image.file.objectKey,
          sortOrder: image.sortOrder,
          originalName: image.file.originalName,
          mimeType: image.file.mimeType,
          sizeBytes: image.file.sizeBytes,
        },
      ]);
      await db.product.update({
        where: { id: product.id },
        data: { status: ProductStatus.PENDING_APPROVAL },
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'PRODUCT_IMAGE_DELETE_REQUEST',
        entityType: 'Product',
        entityId: product.id,
        metadata: { productId: product.id, fileId: image.fileId },
      });
      res.status(204).send();
    }),
  );

  router.post(
    '/:id/approve',
    requireRole([UserRole.ADMIN]),
    asyncHandler(async (req, res) => {
      const current = await db.product.findUnique({
        where: { id: req.params.id },
        include,
      });
      if (!current || current.deletedAt) {
        throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
      }
      const pendingChange = getPendingProductChangeFromProduct(current);
      if (pendingChange) {
        const afterSnapshot = parseSnapshot(pendingChange.afterSnapshot);
        const category = await upsertCategory(db, afterSnapshot.categoryName);
        const product = await db.product.update({
          where: { id: req.params.id },
          data: {
            version: pendingChange.targetVersion,
            name: afterSnapshot.name,
            categoryId: category.id,
            janCode: afterSnapshot.janCode,
            modelNumber: afterSnapshot.modelNumber || null,
            features: normalizeTextArray(afterSnapshot.features),
            cost: afterSnapshot.cost,
            listPrice: afterSnapshot.listPrice,
            minLot: afterSnapshot.minLot,
            leadTime: afterSnapshot.leadTime,
            supplierId: afterSnapshot.supplierId,
            productType: afterSnapshot.productType,
            description: afterSnapshot.description,
            remarks: afterSnapshot.remarks,
            status: ProductStatus.ACTIVE,
            versions: {
              create: {
                version: pendingChange.targetVersion,
                name: afterSnapshot.name,
                categoryName: afterSnapshot.categoryName,
                janCode: afterSnapshot.janCode,
                modelNumber: afterSnapshot.modelNumber || null,
                features: normalizeTextArray(afterSnapshot.features),
                cost: afterSnapshot.cost,
                listPrice: afterSnapshot.listPrice,
                minLot: afterSnapshot.minLot,
                leadTime: afterSnapshot.leadTime,
                description: afterSnapshot.description,
                updatedBy: pendingChange.requestedById ?? req.user?.id,
              },
            },
          },
          include,
        });
        await applyProductImageChanges(db, product.id, getImageChanges(pendingChange));
        await db.productChangeRequest.update({
          where: { id: pendingChange.id },
          data: { status: ChangeRequestStatus.APPROVED, approvedAt: new Date() },
        });
        await writeAuditLog(db, {
          actorId: req.user?.id,
          action: 'PRODUCT_CHANGE_APPROVE',
          entityType: 'Product',
          entityId: product.id,
        });
        const refreshed = await db.product.findUnique({ where: { id: req.params.id }, include });
        res.json({ product: await toProductDtoWithImages(refreshed ?? product, storage) });
        return;
      }
      const latest = [...(current.versions ?? [])].sort((a, b) => b.version - a.version)[0];
      if (!latest) {
        throw new ApiError(400, 'No product version to approve', 'NO_VERSION_TO_APPROVE');
      }
      const category = latest.categoryName ? await upsertCategory(db, latest.categoryName) : null;
      const product = await db.product.update({
        where: { id: req.params.id },
        data: {
          version: latest.version,
          name: latest.name ?? current.name,
          categoryId: category?.id,
          janCode: latest.janCode ?? current.janCode,
          modelNumber: latest.modelNumber ?? current.modelNumber,
          features: latest.features ?? current.features,
          cost: latest.cost,
          listPrice: latest.listPrice,
          minLot: latest.minLot ?? current.minLot,
          leadTime: latest.leadTime ?? current.leadTime,
          description: latest.description,
          status: ProductStatus.ACTIVE,
        },
        include,
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'PRODUCT_APPROVE',
        entityType: 'Product',
        entityId: product.id,
      });
      res.json({ product: await toProductDtoWithImages(product, storage) });
    }),
  );

  router.post(
    '/:id/reject',
    requireRole([UserRole.ADMIN]),
    asyncHandler(async (req, res) => {
      const current = await db.product.findUnique({
        where: { id: req.params.id },
        include,
      });
      if (!current || current.deletedAt) {
        throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
      }
      const pendingChange = getPendingProductChangeFromProduct(current);
      if (pendingChange) {
        await cleanupRejectedProductImageChanges(db, getImageChanges(pendingChange));
        await db.productChangeRequest.update({
          where: { id: pendingChange.id },
          data: { status: ChangeRequestStatus.REJECTED, rejectedAt: new Date() },
        });
      }
      const product = await db.product.update({
        where: { id: req.params.id },
        data: { status: ProductStatus.ACTIVE },
        include,
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'PRODUCT_REJECT',
        entityType: 'Product',
        entityId: product.id,
      });
      res.json({ product: await toProductDtoWithImages(product, storage) });
    }),
  );

  return router;
}

const include = {
  category: true,
  supplier: true,
  versions: { orderBy: { version: 'asc' } },
  images: {
    where: { file: { status: 'READY', deletedAt: null } },
    include: { file: true },
    orderBy: { sortOrder: 'asc' },
  },
  productChangeRequests: {
    where: { status: ChangeRequestStatus.PENDING },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
  attachments: { include: { file: true } },
};

async function upsertCategory(db: DatabaseClient, name: string) {
  return db.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

function resolveWritableSupplierId(req: any, requestedSupplierId?: string) {
  if (req.user?.role === UserRole.SUPPLIER) {
    if (!req.user.supplierId) {
      throw new ApiError(403, 'Supplier user is not linked to a supplier', 'SUPPLIER_NOT_LINKED');
    }
    return req.user.supplierId;
  }
  if (!requestedSupplierId) {
    throw new ApiError(400, 'supplierId is required', 'SUPPLIER_REQUIRED');
  }
  return requestedSupplierId;
}

function resolveWritableListPrice(req: any, cost: number, requestedListPrice?: number) {
  if (req.user?.role === UserRole.SUPPLIER) {
    return cost;
  }
  return requestedListPrice ?? cost;
}

async function assertSupplierExists(db: DatabaseClient, supplierId: string) {
  const suppliers = await db.supplier.findMany({ where: { id: supplierId } });
  if (!suppliers.length) {
    throw new ApiError(400, 'Supplier not found', 'SUPPLIER_NOT_FOUND');
  }
}

function assertCanManageProduct(req: any, product: { supplierId: string }) {
  if (req.user?.role !== UserRole.SUPPLIER) {
    return;
  }
  if (!req.user.supplierId || product.supplierId !== req.user.supplierId) {
    throw new ApiError(403, 'Supplier can manage only own products', 'SUPPLIER_PRODUCT_FORBIDDEN');
  }
}

async function getProductForImageWrite(db: DatabaseClient, productId: string) {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.deletedAt) {
    throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }
  return product;
}

type ProductSnapshot = {
  name: string;
  description: string;
  modelNumber?: string;
  features?: string[];
  categoryName: string;
  janCode: string;
  productType: ProductType;
  cost: number;
  listPrice: number;
  minLot: number;
  leadTime: string;
  supplierId: string;
  remarks?: string;
};

type ProductImageChange = {
  type: 'ADD' | 'DELETE' | 'REORDER';
  fileId?: string;
  objectKey?: string;
  imageId?: string;
  sortOrder?: number;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  warnings?: string[];
  previousOrder?: string[];
  nextOrder?: string[];
};

const productDiffFields: Array<{ key: keyof ProductSnapshot; label: string }> = [
  { key: 'name', label: '商品名' },
  { key: 'categoryName', label: 'カテゴリ' },
  { key: 'janCode', label: 'JAN' },
  { key: 'modelNumber', label: '型番' },
  { key: 'productType', label: '商品タイプ' },
  { key: 'cost', label: '原価' },
  { key: 'listPrice', label: '小売価格' },
  { key: 'minLot', label: '最小ロット' },
  { key: 'leadTime', label: '納期' },
  { key: 'features', label: '特徴' },
  { key: 'description', label: '商品説明' },
  { key: 'remarks', label: '備考' },
  { key: 'supplierId', label: 'サプライヤー' },
];

function buildProductSnapshot(product: any, overrides: Partial<ProductSnapshot & { categoryName?: string }> = {}): ProductSnapshot {
  return {
    name: overrides.name ?? product.name,
    description: overrides.description ?? product.description,
    modelNumber: normalizeOptionalString(overrides.modelNumber ?? product.modelNumber),
    features: normalizeTextArray(overrides.features ?? normalizeStringArrayForRoute(product.features)),
    categoryName: overrides.categoryName ?? product.category?.name ?? '',
    janCode: overrides.janCode ?? product.janCode,
    productType: overrides.productType ?? product.productType,
    cost: Number(overrides.cost ?? product.cost),
    listPrice: Number(overrides.listPrice ?? product.listPrice),
    minLot: Number(overrides.minLot ?? product.minLot),
    leadTime: overrides.leadTime ?? product.leadTime,
    supplierId: overrides.supplierId ?? product.supplierId,
    remarks: normalizeOptionalString(overrides.remarks ?? product.remarks),
  };
}

function getChangedProductFields(beforeSnapshot: ProductSnapshot, afterSnapshot: ProductSnapshot) {
  return productDiffFields
    .map((field) => field.key)
    .filter((key) => JSON.stringify(beforeSnapshot[key] ?? null) !== JSON.stringify(afterSnapshot[key] ?? null));
}

async function getPendingProductChange(db: DatabaseClient, productId: string) {
  return db.productChangeRequest.findFirst({
    where: { productId, status: ChangeRequestStatus.PENDING },
    orderBy: { createdAt: 'desc' },
  });
}

function getPendingProductChangeFromProduct(product: any) {
  return product.productChangeRequests?.[0] ?? null;
}

async function upsertPendingProductChange(
  db: DatabaseClient,
  product: any,
  req: any,
  nextSnapshot?: ProductSnapshot,
  changedFields?: Array<keyof ProductSnapshot>,
  imageChanges: ProductImageChange[] = [],
) {
  const existing = await getPendingProductChange(db, product.id);
  const beforeSnapshot = existing ? parseSnapshot(existing.beforeSnapshot) : buildProductSnapshot(product);
  const afterSnapshot = nextSnapshot ?? (existing ? parseSnapshot(existing.afterSnapshot) : beforeSnapshot);
  const nextImageChanges = mergeImageChanges(getImageChanges(existing), imageChanges);
  const nextChangedFields = changedFields ?? getChangedProductFields(beforeSnapshot, afterSnapshot);
  const data = {
    requestedById: req.user?.id,
    requestedByName: req.user?.name ?? req.user?.email ?? 'Unknown',
    targetVersion: (product.version ?? 1) + 1,
    beforeSnapshot,
    afterSnapshot,
    changedFields: nextChangedFields,
    imageChanges: nextImageChanges,
  };
  if (existing) {
    return db.productChangeRequest.update({
      where: { id: existing.id },
      data,
    });
  }
  return db.productChangeRequest.create({
    data: {
      productId: product.id,
      status: ChangeRequestStatus.PENDING,
      ...data,
    },
  });
}

function mergeImageChanges(existing: ProductImageChange[], incoming: ProductImageChange[]) {
  let changes = [...existing];
  for (const change of incoming) {
    if (change.type === 'REORDER') {
      changes = changes.filter((item) => item.type !== 'REORDER');
      changes.push(change);
      continue;
    }
    if (change.type === 'DELETE' && change.imageId && changes.some((item) => item.type === 'DELETE' && item.imageId === change.imageId)) {
      continue;
    }
    changes.push(change);
  }
  return changes;
}

function getImageChanges(change: any): ProductImageChange[] {
  return Array.isArray(change?.imageChanges) ? change.imageChanges : [];
}

function parseSnapshot(value: unknown): ProductSnapshot {
  return value as ProductSnapshot;
}

async function applyProductImageChanges(db: DatabaseClient, productId: string, changes: ProductImageChange[]) {
  for (const change of changes) {
    if (change.type === 'ADD' && change.fileId) {
      await db.file.update({
        where: { id: change.fileId },
        data: { status: 'READY', purpose: 'PRODUCT_IMAGE_MASTER' },
      });
      await db.productImage.create({
        data: {
          productId,
          fileId: change.fileId,
          sortOrder: change.sortOrder ?? 0,
        },
        include: { file: true },
      });
    }
    if (change.type === 'DELETE' && change.imageId && change.fileId) {
      await db.file.update({
        where: { id: change.fileId },
        data: { status: 'DELETED', deletedAt: new Date() },
      });
      await db.productImage.delete({ where: { id: change.imageId } });
    }
    if (change.type === 'REORDER' && change.nextOrder?.length) {
      await Promise.all(
        change.nextOrder.map((id, sortOrder) =>
          db.productImage.update({
            where: { id },
            data: { sortOrder },
          }),
        ),
      );
    }
  }
}

async function cleanupRejectedProductImageChanges(db: DatabaseClient, changes: ProductImageChange[]) {
  await Promise.all(
    changes
      .filter((change) => change.type === 'ADD' && change.fileId)
      .map((change) =>
        db.file.update({
          where: { id: change.fileId },
          data: { status: 'DELETED', deletedAt: new Date() },
        }),
      ),
  );
}

async function toProductDtoWithImages(product: any, storage?: StorageService) {
  const imageAssets = await Promise.all(
    (product.images ?? []).map((image: any) => toProductImageDto(image, storage)),
  );
  const dto = toProductDto(
    product,
    imageAssets.map((image) => image.url),
    imageAssets,
  );
  const pendingChange = getPendingProductChangeFromProduct(product);
  return {
    ...dto,
    pendingChange: pendingChange ? await toProductPendingChangeDto(pendingChange, product, storage) : undefined,
  };
}

async function toProductPendingChangeDto(change: any, product: any, storage?: StorageService) {
  const beforeSnapshot = parseSnapshot(change.beforeSnapshot);
  const afterSnapshot = parseSnapshot(change.afterSnapshot);
  const changedFields = Array.isArray(change.changedFields) ? change.changedFields : [];
  const imageChanges = getImageChanges(change);
  return {
    id: change.id,
    productId: change.productId,
    status: change.status,
    targetVersion: change.targetVersion,
    requestedById: change.requestedById ?? undefined,
    requestedByName: change.requestedByName ?? undefined,
    createdAt: toDateString(change.createdAt),
    changedFields,
    fieldDiffs: productDiffFields
      .filter((field) => changedFields.includes(field.key))
      .map((field) => ({
        field: field.key,
        label: field.label,
        before: formatDiffValue(field.key, beforeSnapshot[field.key]),
        after: formatDiffValue(field.key, afterSnapshot[field.key]),
      })),
    imageDiffs: await Promise.all(
      imageChanges.map(async (imageChange) => ({
        ...imageChange,
        label:
          imageChange.type === 'ADD'
            ? '追加予定'
            : imageChange.type === 'DELETE'
              ? '削除予定'
              : '並び替え予定',
        url: imageChange.objectKey
          ? storage
            ? await storage.createDownloadUrl({ objectKey: imageChange.objectKey })
            : imageChange.objectKey
          : undefined,
      })),
    ),
    hasDiff: changedFields.length > 0 || imageChanges.length > 0,
    legacy: false,
    currentVersion: product.version,
  };
}

async function toPendingProductImageDto(
  productId: string,
  file: { id: string; objectKey: string; originalName: string; mimeType: string; sizeBytes: number },
  sortOrder: number,
  storage?: StorageService,
  warnings: string[] = [],
) {
  return {
    id: `pending-${file.id}`,
    productId,
    fileId: file.id,
    sortOrder,
    url: storage ? await storage.createDownloadUrl({ objectKey: file.objectKey }) : file.objectKey,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    warnings,
  };
}

async function getProductImages(db: DatabaseClient, storage: StorageService | undefined, productId: string) {
  const images = await db.productImage.findMany({
    where: {
      productId,
      file: { status: 'READY', deletedAt: null },
    },
    include: { file: true },
    orderBy: { sortOrder: 'asc' },
  });
  return Promise.all(images.map((image: any) => toProductImageDto(image, storage)));
}

function normalizeStringArrayForRoute(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  return [];
}

function normalizeOptionalString(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

function formatDiffValue(field: keyof ProductSnapshot, value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '未設定';
  }
  if (field === 'cost' || field === 'listPrice') {
    return `¥${Number(value).toLocaleString()}`;
  }
  if (Array.isArray(value)) {
    return value.length ? value.join('、') : '未設定';
  }
  if (field === 'productType') {
    return value === ProductType.DIRECT ? '直送' : '倉庫';
  }
  return String(value);
}

function toDateString(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

async function toProductImageDto(image: any, storage?: StorageService, warnings: string[] = []) {
  return {
    id: image.id,
    productId: image.productId,
    fileId: image.fileId,
    sortOrder: image.sortOrder,
    url: storage ? await storage.createDownloadUrl({ objectKey: image.file.objectKey }) : image.file.objectKey,
    originalName: image.file.originalName,
    mimeType: image.file.mimeType,
    sizeBytes: image.file.sizeBytes,
    warnings,
  };
}

async function normalizeProductImage(file: Express.Multer.File) {
  const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const supportedFormats = ['jpeg', 'png', 'webp'];
  const metadata = await sharp(file.buffer).metadata().catch(() => null);
  if (!metadata?.width || !metadata.height || !metadata.format) {
    if (!supportedMimeTypes.includes(file.mimetype)) {
      throw new ApiError(400, 'Only JPEG, PNG, and WebP images are supported.', 'UNSUPPORTED_IMAGE_TYPE');
    }
    throw new ApiError(400, 'Image file is invalid or corrupted.', 'INVALID_IMAGE_FILE');
  }
  if (!supportedMimeTypes.includes(file.mimetype) && !supportedFormats.includes(metadata.format)) {
    throw new ApiError(400, 'Only JPEG, PNG, and WebP images are supported.', 'UNSUPPORTED_IMAGE_TYPE');
  }
  if (metadata.width < minImageDimension || metadata.height < minImageDimension) {
    throw new ApiError(400, 'Image is too small. Minimum size is 300 x 300 px.', 'IMAGE_TOO_SMALL');
  }
  if (metadata.width > maxImageDimension || metadata.height > maxImageDimension) {
    throw new ApiError(400, 'Image dimensions are too large.', 'IMAGE_DIMENSIONS_TOO_LARGE');
  }

  const warnings: string[] = [];
  if (metadata.width < 600 || metadata.height < 600) {
    warnings.push('IMAGE_BELOW_RECOMMENDED_SIZE');
  }
  const buffer = await sharp(file.buffer, { failOn: 'error' })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  const normalizedMetadata = await sharp(buffer).metadata();
  return {
    buffer,
    width: normalizedMetadata.width,
    height: normalizedMetadata.height,
    warnings,
  };
}

function buildProductImageObjectKey(productId: string, originalName: string) {
  const safeBaseName =
    originalName
      .replace(/\.[^.]+$/, '')
      .normalize('NFKD')
      .replace(/[^\w-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'product-image';
  return [
    'products',
    productId,
    'images',
    crypto.randomUUID(),
    `master-${new Date().toISOString().replace(/[:.]/g, '-')}-${safeBaseName}.${normalizedImageExtension}`,
  ].join('/');
}

function sha256(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeTextArray(values?: string[]) {
  const normalized = values?.map((value) => value.trim()).filter(Boolean) ?? [];
  return normalized.length ? normalized : undefined;
}

const handleImageUpload: RequestHandler = (req, res, next) => {
  upload.array('images', maxImagesPerProduct)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      const code = error.code === 'LIMIT_FILE_SIZE' ? 'IMAGE_FILE_TOO_LARGE' : 'IMAGE_UPLOAD_LIMIT_EXCEEDED';
      next(new ApiError(400, 'Image upload limit exceeded', code));
      return;
    }
    next(error);
  });
};
