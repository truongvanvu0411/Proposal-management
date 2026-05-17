import { Router } from 'express';
import { ProductStatus, UserRole } from '@prisma/client';
import type { AppConfig, DatabaseClient } from '../types';
import { requireAuth, requireRole } from '../auth/middleware';
import { asyncHandler } from '../shared/asyncHandler';
import { writeAuditLog } from '../shared/audit';
import { createCsv, type CsvColumn } from '../shared/csv';
import { toDateOnly, toNumber } from '../shared/dto';
import { ApiError } from '../shared/errors';

type ExportDataset = 'projects' | 'product-master' | 'web-listing' | 'internal-master' | 'orders';

const datasetRoles: Record<ExportDataset, UserRole[]> = {
  projects: [UserRole.ADMIN, UserRole.PRODUCT_MANAGER],
  'product-master': [UserRole.ADMIN, UserRole.PRODUCT_MANAGER],
  'web-listing': [UserRole.ADMIN, UserRole.PRODUCT_MANAGER],
  'internal-master': [UserRole.ADMIN, UserRole.PRODUCT_MANAGER],
  orders: [UserRole.ADMIN, UserRole.PRODUCT_MANAGER],
};

export function createExportsRouter(db: DatabaseClient, config: AppConfig) {
  const router = Router();
  router.use(requireAuth(config));

  router.get(
    '/:dataset.csv',
    asyncHandler(async (req, res, next) => {
      const dataset = parseDataset(req.params.dataset);
      if (!dataset) {
        throw new ApiError(404, 'Export dataset not found', 'EXPORT_DATASET_NOT_FOUND');
      }

      requireRole(datasetRoles[dataset])(req, res, next);
    }),
    asyncHandler(async (req, res) => {
      const dataset = parseDataset(req.params.dataset);
      if (!dataset) {
        throw new ApiError(404, 'Export dataset not found', 'EXPORT_DATASET_NOT_FOUND');
      }

      const exportResult = await buildExport(db, dataset);
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'EXPORT_CSV',
        entityType: 'Export',
        entityId: dataset,
        metadata: {
          dataset,
          rowCount: exportResult.rowCount,
        },
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${dataset}-${toDateOnly(new Date())}.csv"`,
      );
      res.send(exportResult.csv);
    }),
  );

  return router;
}

function parseDataset(value: string): ExportDataset | null {
  const datasets: ExportDataset[] = ['projects', 'product-master', 'web-listing', 'internal-master', 'orders'];
  return datasets.includes(value as ExportDataset) ? (value as ExportDataset) : null;
}

async function buildExport(db: DatabaseClient, dataset: ExportDataset) {
  switch (dataset) {
    case 'projects':
      return buildProjectsExport(db);
    case 'product-master':
      return buildProductMasterExport(db);
    case 'web-listing':
      return buildWebListingExport(db);
    case 'internal-master':
      return buildInternalMasterExport(db);
    case 'orders':
      return buildOrdersExport(db);
  }
}

async function buildProjectsExport(db: DatabaseClient) {
  const rows = await db.project.findMany({
    where: { deletedAt: null },
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
    {
      header: 'adopted_product_count',
      value: (row) => row.products?.filter((product: { isAdopted: boolean }) => product.isAdopted).length ?? 0,
    },
    { header: 'created_at', value: (row) => row.createdAt },
    { header: 'updated_at', value: (row) => row.updatedAt },
  ];
  return { csv: createCsv(columns, rows), rowCount: rows.length };
}

async function buildProductMasterExport(db: DatabaseClient) {
  const rows = await db.product.findMany({
    where: { deletedAt: null },
    include: { category: true, supplier: true },
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
    { header: 'image_url', value: (row) => row.imageUrl },
    { header: 'version', value: (row) => row.version },
    { header: 'created_at', value: (row) => row.createdAt },
    { header: 'updated_at', value: (row) => row.updatedAt },
  ];
  return { csv: createCsv(columns, rows), rowCount: rows.length };
}

async function buildWebListingExport(db: DatabaseClient) {
  const rows = await db.projectProduct.findMany({
    where: {
      isAdopted: true,
      allowPublish: true,
      project: { deletedAt: null },
      product: {
        deletedAt: null,
        status: { in: [ProductStatus.ACTIVE, ProductStatus.ADOPTED] },
      },
    },
    include: {
      project: { include: { client: true } },
      product: { include: { category: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
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
  return { csv: createCsv(columns, rows), rowCount: rows.length };
}

async function buildInternalMasterExport(db: DatabaseClient) {
  const products = await db.product.findMany({
    where: { deletedAt: null },
    include: {
      category: true,
      supplier: true,
      projectItems: {
        where: { isAdopted: true },
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
    { header: 'project_title', value: (row) => row.projectItem?.project?.title },
    { header: 'client_name', value: (row) => row.projectItem?.project?.client?.name },
    { header: 'adoption_date', value: (row) => row.projectItem?.adoptionDate },
    { header: 'allow_publish', value: (row) => row.projectItem?.allowPublish ?? false },
    { header: 'allow_order', value: (row) => row.projectItem?.allowOrder ?? false },
    { header: 'status', value: (row) => row.product.status },
    { header: 'updated_at', value: (row) => row.product.updatedAt },
  ];
  return { csv: createCsv(columns, rows), rowCount: rows.length };
}

async function buildOrdersExport(db: DatabaseClient) {
  const rows = await db.orderRequest.findMany({
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
