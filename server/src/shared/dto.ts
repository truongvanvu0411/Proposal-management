import type { OrderRequest, Product, Project } from '@prisma/client';

type ProductWithRelations = Product & {
  category?: { name: string } | null;
  supplier?: { name: string } | null;
  versions?: Array<{
    version: number;
    name?: string | null;
    categoryName?: string | null;
    janCode?: string | null;
    modelNumber?: string | null;
    features?: unknown;
    cost: unknown;
    listPrice: unknown;
    description: string;
    minLot?: number | null;
    leadTime?: string | null;
    updatedBy?: string | null;
    createdAt: Date;
  }>;
  attachments?: Array<{ file?: { originalName: string } | null }>;
};

type ProjectWithRelations = Project & {
  client?: { name: string } | null;
  assignedSalesUserId?: string | null;
  assignedSalesUser?: { name: string; email?: string | null } | null;
  products?: Array<{
    productId: string;
    proposalComment: string;
    recommendationReasons?: unknown;
    cost: unknown;
    sellingPrice: unknown;
    quantity: number;
    displayOrder?: number;
    isAdopted: boolean;
    companyProductCode?: string | null;
    adoptionDate?: Date | null;
    orderPlannedDate?: Date | null;
    deliveryMethod?: string | null;
    allowPublish?: boolean;
    allowOrder?: boolean;
    orderStatus?: string | null;
  }>;
  orderRequests?: OrderRequest[];
};

export function toDateOnly(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function toNumber(value: unknown) {
  return Number(value);
}

export function toProductDto(
  product: ProductWithRelations,
  imageUrls?: string[],
  imageAssets?: Array<{
    id: string;
    sortOrder: number;
    url: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }>,
) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    modelNumber: product.modelNumber ?? undefined,
    features: normalizeStringArray(product.features),
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? '',
    janCode: product.janCode,
    productType: product.productType,
    cost: toNumber(product.cost),
    listPrice: toNumber(product.listPrice),
    minLot: product.minLot,
    leadTime: product.leadTime,
    supplierId: product.supplierId,
    supplierName: product.supplier?.name ?? '',
    status: product.status,
    availableFrom: product.availableFrom ? toDateOnly(product.availableFrom) : undefined,
    availableTo: product.availableTo ? toDateOnly(product.availableTo) : undefined,
    images: imageUrls?.length ? imageUrls : product.imageUrl ? [product.imageUrl] : [],
    imageAssets: imageAssets ?? [],
    attachments: product.attachments?.map((attachment) => attachment.file?.originalName ?? '') ?? [],
    createdAt: toDateOnly(product.createdAt),
    version: product.version,
    versions:
      product.versions?.map((version) => ({
        version: version.version,
        name: version.name ?? undefined,
        categoryName: version.categoryName ?? undefined,
        janCode: version.janCode ?? undefined,
        modelNumber: version.modelNumber ?? undefined,
        features: normalizeStringArray(version.features),
        cost: toNumber(version.cost),
        listPrice: toNumber(version.listPrice),
        minLot: version.minLot ?? undefined,
        leadTime: version.leadTime ?? undefined,
        description: version.description,
        updatedBy: version.updatedBy ?? undefined,
        createdAt: toDateOnly(version.createdAt),
      })) ?? [],
    remarks: product.remarks ?? undefined,
  };
}

export function toProjectDto(project: ProjectWithRelations, options: { maskFinancials?: boolean } = {}) {
  const maskFinancials = options.maskFinancials ?? false;
  return {
    id: project.id,
    title: project.title,
    clientId: project.clientId,
    clientName: project.client?.name ?? '',
    assignedSalesUserId: project.assignedSalesUserId ?? undefined,
    assignedSalesUserName: project.assignedSalesUser?.name ?? undefined,
    status: project.status,
    proposalBackground: project.proposalBackground ?? undefined,
    recommendationPoints: normalizeStringArray(project.recommendationPoints),
    remarks: project.remarks ?? undefined,
    products:
      project.products?.map((product) => ({
        productId: product.productId,
        proposalComment: product.proposalComment,
        recommendationReasons: normalizeRecommendationReasons(product.recommendationReasons),
        cost: maskFinancials ? 0 : toNumber(product.cost),
        sellingPrice: maskFinancials ? 0 : toNumber(product.sellingPrice),
        quantity: product.quantity,
        displayOrder: product.displayOrder ?? 0,
        isAdopted: product.isAdopted,
        companyProductCode: product.companyProductCode ?? undefined,
        adoptionDate: product.adoptionDate ? toDateOnly(product.adoptionDate) : undefined,
        orderPlannedDate: product.orderPlannedDate ? toDateOnly(product.orderPlannedDate) : undefined,
        deliveryMethod: product.deliveryMethod ?? undefined,
        allowPublish: product.allowPublish ?? false,
        allowOrder: product.allowOrder ?? false,
        orderStatus: product.orderStatus ?? undefined,
      })) ?? [],
    orderRequests:
      project.orderRequests?.map((order) => ({
        id: order.id,
        projectId: order.projectId,
        productId: order.productId,
        productName: order.productName,
        supplierId: order.supplierId,
        quantity: order.quantity,
        deliveryDate: toDateOnly(order.deliveryDate),
        deliveryLocation: order.deliveryLocation,
        status: order.status,
        orderType: order.orderType,
        createdAt: toDateOnly(order.createdAt),
      })) ?? [],
    totalRevenue: maskFinancials ? 0 : toNumber(project.totalRevenue),
    totalProfit: maskFinancials ? 0 : toNumber(project.totalProfit),
    createdAt: toDateOnly(project.createdAt),
    updatedAt: toDateOnly(project.updatedAt),
  };
}

export function toOrderRequestDto(order: OrderRequest) {
  return {
    id: order.id,
    projectId: order.projectId,
    productId: order.productId,
    productName: order.productName,
    supplierId: order.supplierId,
    quantity: order.quantity,
    deliveryDate: toDateOnly(order.deliveryDate),
    deliveryLocation: order.deliveryLocation,
    status: order.status,
    orderType: order.orderType,
    createdAt: toDateOnly(order.createdAt),
  };
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeRecommendationReasons(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is { title?: unknown; detail?: unknown } => typeof item === 'object' && item !== null)
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title : '',
      detail: typeof item.detail === 'string' ? item.detail : '',
    }));
}
