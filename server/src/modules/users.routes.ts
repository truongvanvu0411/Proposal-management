import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import type { AppConfig, DatabaseClient } from '../types';
import { requireAuth, requireRole } from '../auth/middleware';
import { asyncHandler } from '../shared/asyncHandler';
import { ApiError } from '../shared/errors';
import { writeAuditLog } from '../shared/audit';
import { validateBody } from '../shared/validation';

const userSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  role: z.nativeEnum(UserRole),
  supplierId: z.string().min(1).optional().or(z.literal('')),
  password: z.string().min(8).max(200),
});

const userUpdateSchema = userSchema.omit({ password: true }).partial();
const resetPasswordSchema = z.object({
  password: z.string().min(8).max(200),
});

export function createUsersRouter(db: DatabaseClient, config: AppConfig) {
  const router = Router();
  router.use(requireAuth(config));

  router.get(
    '/',
    requireRole([UserRole.ADMIN, UserRole.PRODUCT_MANAGER]),
    asyncHandler(async (req, res) => {
      const role = parseRoleQuery(req.query.role);
      const isProductManager = req.user?.role === UserRole.PRODUCT_MANAGER;
      const supplierId = !isProductManager && typeof req.query.supplierId === 'string' ? req.query.supplierId : undefined;
      const status = isProductManager ? 'ACTIVE' : typeof req.query.status === 'string' ? req.query.status : 'ACTIVE';
      const effectiveRole = isProductManager ? UserRole.SALES : role;

      const users = await db.user.findMany({
        where: {
          ...(status === 'DELETED' ? { deletedAt: { not: null } } : status === 'ALL' ? {} : { deletedAt: null }),
          ...(effectiveRole && effectiveRole !== 'ALL' ? { role: effectiveRole } : {}),
          ...(supplierId && supplierId !== 'ALL' ? { supplierId } : {}),
        },
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ users: users.map(toUserDto) });
    }),
  );

  router.post(
    '/',
    requireRole([UserRole.ADMIN]),
    validateBody(userSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof userSchema>;
      const supplierId = await normalizeSupplierId(db, body.role, body.supplierId);
      const user = await db.user.create({
        data: {
          name: body.name,
          email: body.email,
          role: body.role,
          supplierId,
          passwordHash: await bcrypt.hash(body.password, 12),
        },
        include: { supplier: true },
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'USER_CREATE',
        entityType: 'User',
        entityId: user.id,
        metadata: { role: user.role, supplierId: user.supplierId },
      });
      res.status(201).json({ user: toUserDto(user) });
    }),
  );

  router.patch(
    '/:id',
    requireRole([UserRole.ADMIN]),
    validateBody(userUpdateSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof userUpdateSchema>;
      const current = await db.user.findUnique({ where: { id: req.params.id } });
      if (!current || current.deletedAt) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }
      const nextRole = body.role ?? current.role;
      const supplierId = body.role || body.supplierId !== undefined
        ? await normalizeSupplierId(db, nextRole, body.supplierId)
        : undefined;

      const user = await db.user.update({
        where: { id: req.params.id },
        data: {
          name: body.name,
          email: body.email,
          role: body.role,
          supplierId,
        },
        include: { supplier: true },
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'USER_UPDATE',
        entityType: 'User',
        entityId: user.id,
        metadata: { role: user.role, supplierId: user.supplierId },
      });
      res.json({ user: toUserDto(user) });
    }),
  );

  router.post(
    '/:id/reset-password',
    requireRole([UserRole.ADMIN]),
    validateBody(resetPasswordSchema),
    asyncHandler(async (req, res) => {
      const current = await db.user.findUnique({ where: { id: req.params.id } });
      if (!current || current.deletedAt) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }
      await db.user.update({
        where: { id: req.params.id },
        data: { passwordHash: await bcrypt.hash((req.body as z.infer<typeof resetPasswordSchema>).password, 12) },
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'USER_RESET_PASSWORD',
        entityType: 'User',
        entityId: req.params.id,
      });
      res.status(204).send();
    }),
  );

  router.delete(
    '/:id',
    requireRole([UserRole.ADMIN]),
    asyncHandler(async (req, res) => {
      if (req.params.id === req.user?.id) {
        throw new ApiError(400, 'You cannot delete your own user account', 'CANNOT_DELETE_SELF');
      }
      const current = await db.user.findUnique({ where: { id: req.params.id } });
      if (!current || current.deletedAt) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }
      await db.user.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date() },
      });
      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'USER_DELETE',
        entityType: 'User',
        entityId: req.params.id,
      });
      res.status(204).send();
    }),
  );

  return router;
}

function parseRoleQuery(value: unknown) {
  if (value === undefined || value === 'ALL') {
    return value as undefined | 'ALL';
  }
  if (typeof value !== 'string' || !Object.values(UserRole).includes(value as UserRole)) {
    throw new ApiError(400, 'Invalid user role filter', 'INVALID_USER_ROLE');
  }
  return value as UserRole;
}

async function normalizeSupplierId(db: DatabaseClient, role: UserRole, supplierId?: string | null) {
  if (role !== UserRole.SUPPLIER) {
    return null;
  }
  if (!supplierId) {
    throw new ApiError(400, 'supplierId is required for supplier users', 'SUPPLIER_REQUIRED');
  }
  const suppliers = await db.supplier.findMany({ where: { id: supplierId, deletedAt: null } });
  if (!suppliers.length) {
    throw new ApiError(400, 'Supplier not found', 'SUPPLIER_NOT_FOUND');
  }
  return supplierId;
}

function toUserDto(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  supplierId?: string | null;
  supplier?: { name?: string | null } | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    supplierId: user.supplierId ?? undefined,
    supplierName: user.supplier?.name ?? undefined,
    createdAt: user.createdAt ? user.createdAt.toISOString().slice(0, 10) : undefined,
    updatedAt: user.updatedAt ? user.updatedAt.toISOString().slice(0, 10) : undefined,
    deleted: Boolean(user.deletedAt),
  };
}
