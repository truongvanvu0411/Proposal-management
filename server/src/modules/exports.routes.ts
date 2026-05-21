import { Router } from 'express';
import { ProductStatus, UserRole } from '@prisma/client';
import PizZip from 'pizzip';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppConfig, DatabaseClient, StorageService } from '../types';
import { requireAuth, requireRole } from '../auth/middleware';
import { asyncHandler } from '../shared/asyncHandler';
import { writeAuditLog } from '../shared/audit';
import { createCsv, type CsvColumn } from '../shared/csv';
import { toDateOnly, toNumber } from '../shared/dto';
import { ApiError } from '../shared/errors';

type ExportDataset = 'projects' | 'product-master' | 'web-listing' | 'internal-master' | 'orders' | 'adopted-products';

type ExportFilters = {
  supplierId?: string;
  clientId?: string;
  status?: string;
  productStatus?: ProductStatus;
  fromDate?: Date;
  toDate?: Date;
};

type ExportImageRef = {
  productId: string;
  productName: string;
  companyProductCode?: string | null;
  images: Array<{
    objectKey?: string;
    imageUrl?: string | null;
    originalName: string;
    mimeType: string;
  }>;
};

type ExportResult = {
  csv: string;
  rowCount: number;
  imageRefs?: ExportImageRef[];
};

const datasetRoles: Record<ExportDataset, UserRole[]> = {
  projects: [UserRole.ADMIN, UserRole.PRODUCT_MANAGER],
  'product-master': [UserRole.ADMIN, UserRole.PRODUCT_MANAGER],
  'web-listing': [UserRole.ADMIN, UserRole.PRODUCT_MANAGER],
  'internal-master': [UserRole.ADMIN, UserRole.PRODUCT_MANAGER],
  orders: [UserRole.ADMIN, UserRole.PRODUCT_MANAGER],
  'adopted-products': [UserRole.ADMIN, UserRole.PRODUCT_MANAGER],
};

const productIncludeForExport = {
  category: true,
  supplier: true,
  images: {
    where: { file: { status: 'READY', deletedAt: null } },
    include: { file: true },
    orderBy: { sortOrder: 'asc' },
  },
};

export function createExportsRouter(db: DatabaseClient, config: AppConfig, storage?: StorageService) {
  const router = Router();
  router.use(requireAuth(config));

  const authorizeDataset = asyncHandler(async (req, res, next) => {
    const dataset = parseDataset(req.params.dataset);
    if (!dataset) {
      throw new ApiError(404, 'Export dataset not found', 'EXPORT_DATASET_NOT_FOUND');
    }
    requireRole(datasetRoles[dataset])(req, res, next);
  });

  router.get(
    '/:dataset.csv',
    authorizeDataset,
    asyncHandler(async (req, res) => {
      const dataset = parseDataset(req.params.dataset);
      if (!dataset) {
        throw new ApiError(404, 'Export dataset not found', 'EXPORT_DATASET_NOT_FOUND');
      }
      const filters = parseExportFilters(req.query as Record<string, unknown>);
      const exportResult = await buildExport(db, dataset, filters);
      await writeExportAudit(db, req.user?.id, dataset, exportResult.rowCount, filters);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${dataset}-${toDateOnly(new Date())}.csv"`,
      );
      res.send(exportResult.csv);
    }),
  );

  router.get(
    '/:dataset.zip',
    authorizeDataset,
    asyncHandler(async (req, res) => {
      const dataset = parseDataset(req.params.dataset);
      if (!dataset) {
        throw new ApiError(404, 'Export dataset not found', 'EXPORT_DATASET_NOT_FOUND');
      }
      if (!isProductDataset(dataset)) {
        throw new ApiError(400, 'Images can be exported only with product related datasets', 'EXPORT_IMAGES_UNSUPPORTED');
      }
      const filters = parseExportFilters(req.query as Record<string, unknown>);
      const exportResult = await buildExport(db, dataset, filters);
      const zipBuffer = await buildExportZip(dataset, exportResult, storage);
      await writeExportAudit(db, req.user?.id, dataset, exportResult.rowCount, filters, true);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${dataset}-${toDateOnly(new Date())}-images.zip"`,
      );
      res.send(zipBuffer);
    }),
  );

  return router;
}

function parseDataset(value: string): ExportDataset | null {
  const datasets: ExportDataset[] = ['projects', 'product-master', 'web-listing', 'internal-master', 'orders', 'adopted-products'];
  return datasets.includes(value as ExportDataset) ? (value as ExportDataset) : null;
}

function parseExportFilters(query: Record<string, unknown>): ExportFilters {
  const productStatus = typeof query.productStatus === 'string' && query.productStatus in ProductStatus
    ? query.productStatus as ProductStatus
    : undefined;
  return {
    supplierId: nonAllString(query.supplierId),
    clientId: nonAllString(query.clientId),
    status: nonAllString(query.status),
    productStatus,
    fromDate: parseFilterDate(query.fromDate, false),
    toDate: parseFilterDate(query.toDate, true),
  };
}

function nonAllString(value: unknown) {
  return typeof value === 'string' && value && value !== 'ALL' ? value : undefined;
}

function parseFilterDate(value: unknown, endOfDay: boolean) {
  if (typeof value !== 'string' || !value) return undefined;
  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
}

function createdAtRange(filters: ExportFilters) {
  return {
    ...(filters.fromDate || filters.toDate
      ? {
          createdAt: {
            ...(filters.fromDate ? { gte: filters.fromDate } : {}),
            ...(filters.toDate ? { lte: filters.toDate } : {}),
          },
        }
      : {}),
  };
}

async function buildExport(db: DatabaseClient, dataset: ExportDataset, filters: ExportFilters): Promise<ExportResult> {
  switch (dataset) {
    case 'projects':
      return buildProjectsExport(db, filters);
    case 'product-master':
      return buildProductMasterExport(db, filters);
    case 'web-listing':
      return buildWebListingExport(db, filters);
    case 'internal-master':
      return buildInternalMasterExport(db, filters);
    case 'orders':
      return buildOrdersExport(db, filters);
    case 'adopted-products':
      return buildAdoptedProductsExport(db, filters);
  }
}

async function buildProjectsExport(db: DatabaseClient, filters: ExportFilters) {
  const rows = await db.project.findMany({
    where: {
      deletedAt: null,
      ...createdAtRange(filters),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.supplierId ? { products: { some: { product: { supplierId: filters.supplierId } } } } : {}),
    },
    include: { client: true, products: true },
    orderBy: { createdAt: 'desc' },
  });
  const columns: Array<CsvColumn<any>> = [
    { header: 'project_id', value: (row) => row.id },
    { header: 'title', value: (row) => row.title },
    { header: 'client_name', value: (row) => row.client?.name },
    { header: 'status', value: (row) => row.status },
    { header: 'total_revenue', value: (row) => toNumber(row.totalRevenue) },
    { header: 'total_profit', value: (row) => toNumber(row.totalProfit) },
    { header: 'product_count', value: (row) => row.products?.length ?? 0 },
    { header: 'adopted_product_count', value: (row) => row.products?.filter((product: { isAdopted: boolean }) => product.isAdopted).length ?? 0 },
    { header: 'created_at', value: (row) => row.createdAt },
    { header: 'updated_at', value: (row) => row.updatedAt },
  ];
  return { csv: createCsv(columns, rows), rowCount: rows.length };
}

async function buildProductMasterExport(db: DatabaseClient, filters: ExportFilters) {
  const rows = await db.product.findMany({
    where: {
      deletedAt: null,
      ...createdAtRange(filters),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.productStatus ? { status: filters.productStatus } : {}),
    },
    include: productIncludeForExport,
    orderBy: { createdAt: 'desc' },
  });
  const columns: Array<CsvColumn<any>> = [
    { header: 'product_id', value: (row) => row.id },
    { header: 'name', value: (row) => row.name },
    { header: 'description', value: (row) => row.description },
    { header: 'category_name', value: (row) => row.category?.name },
    { header: 'jan_code', value: (row) => row.janCode },
    { header: 'product_type', value: (row) => row.productType },
    { header: 'status', value: (row) => row.status },
    { header: 'supplier_name', value: (row) => row.supplier?.name },
    { header: 'cost', value: (row) => toNumber(row.cost) },
    { header: 'list_price', value: (row) => toNumber(row.listPrice) },
    { header: 'min_lot', value: (row) => row.minLot },
    { header: 'lead_time', value: (row) => row.leadTime },
    { header: 'available_from', value: (row) => row.availableFrom },
    { header: 'available_to', value: (row) => row.availableTo },
    { header: 'image_url', value: (row) => row.imageUrl },
    { header: 'image_count', value: (row) => row.images?.length ?? 0 },
    { header: 'version', value: (row) => row.version },
    { header: 'created_at', value: (row) => row.createdAt },
    { header: 'updated_at', value: (row) => row.updatedAt },
  ];
  return { csv: createCsv(columns, rows), rowCount: rows.length, imageRefs: rows.map((row) => productImageRef(row)) };
}

async function buildAdoptedProductsExport(db: DatabaseClient, filters: ExportFilters) {
  const rows = await findAdoptedProjectProducts(db, filters, false);
  const columns = adoptedProductColumns();
  return {
    csv: createCsv(columns, rows),
    rowCount: rows.length,
    imageRefs: rows.map((row: any) => productImageRef(row.product, row.companyProductCode)),
  };
}

async function buildWebListingExport(db: DatabaseClient, filters: ExportFilters) {
  const rows = await findAdoptedProjectProducts(db, filters, true);
  const columns: Array<CsvColumn<any>> = [
    { header: 'company_product_code', value: (row) => row.companyProductCode },
    { header: 'product_name', value: (row) => row.product?.name },
    { header: 'product_description', value: (row) => row.product?.description },
    { header: 'jan_code', value: (row) => row.product?.janCode },
    { header: 'category_name', value: (row) => row.product?.category?.name },
    { header: 'product_type', value: (row) => row.product?.productType },
    { header: 'listing_price', value: (row) => toNumber(row.product?.listPrice) },
    { header: 'image_url', value: (row) => row.product?.imageUrl },
    { header: 'project_title', value: (row) => row.project?.title },
    { header: 'client_name', value: (row) => row.project?.client?.name },
    { header: 'adoption_date', value: (row) => row.adoptionDate },
  ];
  return { csv: createCsv(columns, rows), rowCount: rows.length, imageRefs: rows.map((row: any) => productImageRef(row.product, row.companyProductCode)) };
}

async function buildInternalMasterExport(db: DatabaseClient, filters: ExportFilters) {
  const products = await db.product.findMany({
    where: {
      deletedAt: null,
      ...createdAtRange(filters),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.productStatus ? { status: filters.productStatus } : {}),
    },
    include: {
      ...productIncludeForExport,
      projectItems: {
        where: {
          isAdopted: true,
          ...(filters.clientId ? { project: { clientId: filters.clientId } } : {}),
          ...(filters.status ? { project: { status: filters.status } } : {}),
        },
        include: { project: { include: { client: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  const rows = products.flatMap((product: any) => {
    const adoptedItems = product.projectItems?.length ? product.projectItems : [null];
    return adoptedItems.map((projectItem: any | null) => ({ product, projectItem }));
  });
  const columns: Array<CsvColumn<any>> = [
    { header: 'company_product_code', value: (row) => row.projectItem?.companyProductCode },
    { header: 'product_id', value: (row) => row.product.id },
    { header: 'product_name', value: (row) => row.product.name },
    { header: 'product_description', value: (row) => row.product.description },
    { header: 'jan_code', value: (row) => row.product.janCode },
    { header: 'category_name', value: (row) => row.product.category?.name },
    { header: 'product_type', value: (row) => row.product.productType },
    { header: 'supplier_name', value: (row) => row.product.supplier?.name },
    { header: 'cost_price', value: (row) => toNumber(row.product.cost) },
    { header: 'reference_retail_price', value: (row) => toNumber(row.product.listPrice) },
    { header: 'min_lot', value: (row) => row.product.minLot },
    { header: 'lead_time', value: (row) => row.product.leadTime },
    { header: 'available_from', value: (row) => row.product.availableFrom },
    { header: 'available_to', value: (row) => row.product.availableTo },
    { header: 'project_title', value: (row) => row.projectItem?.project?.title },
    { header: 'client_name', value: (row) => row.projectItem?.project?.client?.name },
    { header: 'adoption_date', value: (row) => row.projectItem?.adoptionDate },
    { header: 'allow_publish', value: (row) => row.projectItem?.allowPublish ?? false },
    { header: 'allow_order', value: (row) => row.projectItem?.allowOrder ?? false },
    { header: 'status', value: (row) => row.product.status },
    { header: 'image_count', value: (row) => row.product.images?.length ?? 0 },
    { header: 'updated_at', value: (row) => row.product.updatedAt },
  ];
  return { csv: createCsv(columns, rows), rowCount: rows.length, imageRefs: rows.map((row: any) => productImageRef(row.product, row.projectItem?.companyProductCode)) };
}

async function buildOrdersExport(db: DatabaseClient, filters: ExportFilters) {
  const rows = await db.orderRequest.findMany({
    where: {
      ...createdAtRange(filters),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.clientId ? { project: { clientId: filters.clientId } } : {}),
    },
    include: {
      project: { include: { client: true } },
      supplier: true,
      product: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  const columns: Array<CsvColumn<any>> = [
    { header: 'order_id', value: (row) => row.id },
    { header: 'project_title', value: (row) => row.project?.title },
    { header: 'client_name', value: (row) => row.project?.client?.name },
    { header: 'product_id', value: (row) => row.productId },
    { header: 'product_name', value: (row) => row.productName },
    { header: 'supplier_name', value: (row) => row.supplier?.name },
    { header: 'quantity', value: (row) => row.quantity },
    { header: 'delivery_date', value: (row) => row.deliveryDate },
    { header: 'delivery_location', value: (row) => row.deliveryLocation },
    { header: 'status', value: (row) => row.status },
    { header: 'order_type', value: (row) => row.orderType },
    { header: 'created_at', value: (row) => row.createdAt },
    { header: 'updated_at', value: (row) => row.updatedAt },
  ];
  return { csv: createCsv(columns, rows), rowCount: rows.length };
}

async function findAdoptedProjectProducts(db: DatabaseClient, filters: ExportFilters, publishOnly: boolean) {
  return db.projectProduct.findMany({
    where: {
      isAdopted: true,
      ...(publishOnly ? { allowPublish: true } : {}),
      project: {
        deletedAt: null,
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...createdAtRange(filters),
      },
      product: {
        deletedAt: null,
        ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
        ...(filters.productStatus
          ? { status: filters.productStatus }
          : { status: { in: [ProductStatus.ACTIVE, ProductStatus.ADOPTED] } }),
      },
    },
    include: {
      project: { include: { client: true } },
      product: { include: productIncludeForExport },
    },
    orderBy: { createdAt: 'desc' },
  });
}

function adoptedProductColumns(): Array<CsvColumn<any>> {
  return [
    { header: 'company_product_code', value: (row) => row.companyProductCode },
    { header: 'product_id', value: (row) => row.productId },
    { header: 'product_name', value: (row) => row.product?.name },
    { header: 'jan_code', value: (row) => row.product?.janCode },
    { header: 'category_name', value: (row) => row.product?.category?.name },
    { header: 'supplier_name', value: (row) => row.product?.supplier?.name },
    { header: 'project_title', value: (row) => row.project?.title },
    { header: 'client_name', value: (row) => row.project?.client?.name },
    { header: 'selling_price', value: (row) => toNumber(row.sellingPrice) },
    { header: 'quantity', value: (row) => row.quantity },
    { header: 'sales_amount', value: (row) => toNumber(row.sellingPrice) * row.quantity },
    { header: 'adoption_date', value: (row) => row.adoptionDate },
    { header: 'allow_order', value: (row) => row.allowOrder },
    { header: 'order_status', value: (row) => row.orderStatus },
    { header: 'delivery_method', value: (row) => row.deliveryMethod },
    { header: 'image_count', value: (row) => row.product?.images?.length ?? 0 },
  ];
}

function productImageRef(product: any, companyProductCode?: string | null): ExportImageRef {
  const storageImages = (product.images ?? [])
    .filter((image: any) => image.file?.objectKey)
    .map((image: any) => ({
      objectKey: image.file.objectKey,
      originalName: image.file.originalName,
      mimeType: image.file.mimeType,
    }));
  const fallbackImage = product.imageUrl
    ? [{
        imageUrl: product.imageUrl,
        originalName: path.basename(product.imageUrl.split('?')[0]) || `${product.id}.jpg`,
        mimeType: guessImageMimeType(product.imageUrl),
      }]
    : [];
  return {
    productId: product.id,
    productName: product.name,
    companyProductCode,
    images: [...storageImages, ...fallbackImage],
  };
}

async function buildExportZip(dataset: ExportDataset, exportResult: ExportResult, storage?: StorageService) {
  const zip = new PizZip();
  zip.file(`${dataset}.csv`, exportResult.csv);
  zip.file('README.txt', 'CSVとimagesフォルダ内の画像は product_id / company_product_code / index で紐づけできます。');

  for (const ref of exportResult.imageRefs ?? []) {
    for (const [index, image] of ref.images.entries()) {
      const bytes = image.objectKey && storage
        ? await storage.getObject({ objectKey: image.objectKey }).catch(() => null)
        : await readExportImageUrl(image.imageUrl);
      if (!bytes?.length) continue;
      const extension = imageExtension(image.mimeType, image.originalName);
      const fileName = [
        sanitizeFilePart(ref.companyProductCode || 'no-code'),
        sanitizeFilePart(ref.productId),
        String(index + 1).padStart(2, '0'),
        sanitizeFilePart(ref.productName),
      ].join('__');
      zip.file(`images/${fileName}.${extension}`, bytes);
    }
  }

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

async function readExportImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) {
    const response = await fetch(imageUrl).catch(() => null);
    if (!response?.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  }
  const normalized = imageUrl.replace(/^\/+/, '').replace(/^assets[\\/]/, 'assets/');
  const filePath = path.join(process.cwd(), 'public', normalized);
  return fs.readFile(filePath).catch(() => null);
}

function guessImageMimeType(imageUrl: string) {
  const extension = path.extname(imageUrl.split('?')[0]).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function imageExtension(mimeType: string, originalName: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/jpeg') return 'jpg';
  const match = originalName.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() || 'jpg';
}

function sanitizeFilePart(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function isProductDataset(dataset: ExportDataset) {
  return ['product-master', 'web-listing', 'internal-master', 'adopted-products'].includes(dataset);
}

async function writeExportAudit(
  db: DatabaseClient,
  actorId: string | undefined,
  dataset: ExportDataset,
  rowCount: number,
  filters: ExportFilters,
  includeImages = false,
) {
  await writeAuditLog(db, {
    actorId,
    action: includeImages ? 'EXPORT_ZIP' : 'EXPORT_CSV',
    entityType: 'Export',
    entityId: dataset,
    metadata: {
      dataset,
      rowCount,
      includeImages,
      filters: {
        supplierId: filters.supplierId,
        clientId: filters.clientId,
        status: filters.status,
        productStatus: filters.productStatus,
        fromDate: filters.fromDate?.toISOString(),
        toDate: filters.toDate?.toISOString(),
      },
    },
  });
}
