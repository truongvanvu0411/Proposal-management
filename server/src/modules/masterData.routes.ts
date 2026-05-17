import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import type { AppConfig, DatabaseClient } from '../types';
import { requireAuth, requireRole } from '../auth/middleware';
import { asyncHandler } from '../shared/asyncHandler';
import { ApiError } from '../shared/errors';
import { validateBody } from '../shared/validation';
import { writeAuditLog } from '../shared/audit';

const masterDataSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  email: z.string().email(),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
});

const mutationRoles = [UserRole.ADMIN];

export function createSupplierRouter(db: DatabaseClient, config: AppConfig) {
  const router = Router();
  router.use(requireAuth(config));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      if (req.user?.role === UserRole.SALES) {
        throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
      }
      const where =
        req.user?.role === UserRole.SUPPLIER
          ? { id: req.user.supplierId ?? '__no_supplier__', deletedAt: null }
          : { deletedAt: null };
      const suppliers = await db.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      res.json({ suppliers });
    }),
  );

  router.post(
    '/',
    requireRole(mutationRoles),
    validateBody(masterDataSchema),
    asyncHandler(async (req, res) => {
      const supplier = await db.supplier.create({ data: req.body });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'SUPPLIER_CREATE',
        entityType: 'Supplier',
        entityId: getId(supplier),
      });
      res.status(201).json({ supplier });
    }),
  );

  router.patch(
    '/:id',
    requireRole(mutationRoles),
    validateBody(masterDataSchema.partial()),
    asyncHandler(async (req, res) => {
      const supplier = await db.supplier.update({
        where: { id: req.params.id },
        data: req.body,
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'SUPPLIER_UPDATE',
        entityType: 'Supplier',
        entityId: req.params.id,
      });
      res.json({ supplier });
    }),
  );

  router.delete(
    '/:id',
    requireRole(mutationRoles),
    asyncHandler(async (req, res) => {
      await db.supplier.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date() },
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'SUPPLIER_DELETE',
        entityType: 'Supplier',
        entityId: req.params.id,
      });
      res.status(204).send();
    }),
  );

  return router;
}

export function createClientRouter(db: DatabaseClient, config: AppConfig) {
  const router = Router();
  router.use(requireAuth(config));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      if (req.user?.role === UserRole.SUPPLIER || req.user?.role === UserRole.SALES) {
        throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
      }
      const clients = await db.client.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ clients });
    }),
  );

  router.post(
    '/',
    requireRole(mutationRoles),
    validateBody(masterDataSchema),
    asyncHandler(async (req, res) => {
      const client = await db.client.create({ data: req.body });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'CLIENT_CREATE',
        entityType: 'Client',
        entityId: getId(client),
      });
      res.status(201).json({ client });
    }),
  );

  router.patch(
    '/:id',
    requireRole(mutationRoles),
    validateBody(masterDataSchema.partial()),
    asyncHandler(async (req, res) => {
      const client = await db.client.update({
        where: { id: req.params.id },
        data: req.body,
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'CLIENT_UPDATE',
        entityType: 'Client',
        entityId: req.params.id,
      });
      res.json({ client });
    }),
  );

  router.delete(
    '/:id',
    requireRole(mutationRoles),
    asyncHandler(async (req, res) => {
      await db.client.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date() },
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'CLIENT_DELETE',
        entityType: 'Client',
        entityId: req.params.id,
      });
      res.status(204).send();
    }),
  );

  return router;
}

function getId(value: unknown) {
  return typeof value === 'object' && value !== null && 'id' in value
    ? String(value.id)
    : undefined;
}
