import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig, AppUser, DatabaseClient } from '../types';
import { asyncHandler } from '../shared/asyncHandler';
import { ApiError } from '../shared/errors';
import { validateBody } from '../shared/validation';
import { writeAuditLog } from '../shared/audit';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from '../auth/tokens';
import { requireAuth } from '../auth/middleware';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

interface UserRecord extends AppUser {
  passwordHash: string;
  deletedAt?: Date | null;
}

export function createAuthRouter(db: DatabaseClient, config: AppConfig) {
  const router = Router();

  router.post(
    '/login',
    validateBody(loginSchema),
    asyncHandler(async (req, res) => {
      const { email, password } = req.body as z.infer<typeof loginSchema>;
      const user = (await db.user.findUnique({
        where: { email },
      })) as UserRecord | null;

      if (!user || user.deletedAt) {
        throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatches) {
        throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
      }

      const appUser = toAppUser(user);
      const accessToken = createAccessToken(appUser, config);
      const refreshToken = createRefreshToken(appUser, config);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
      });

      await writeAuditLog(db, {
        actorId: appUser.id,
        action: 'AUTH_LOGIN',
        entityType: 'User',
        entityId: appUser.id,
      });

      res.json({ user: appUser, accessToken, refreshToken });
    }),
  );

  router.post(
    '/refresh',
    validateBody(refreshSchema),
    asyncHandler(async (req, res) => {
      const token = (req.body as z.infer<typeof refreshSchema>).refreshToken ?? req.cookies.refreshToken;
      if (!token) {
        throw new ApiError(401, 'Refresh token required', 'REFRESH_REQUIRED');
      }

      const tokenUser = verifyRefreshToken(token, config);
      const user = (await db.user.findUnique({
        where: { id: tokenUser.id },
      })) as UserRecord | null;

      if (!user || user.deletedAt) {
        throw new ApiError(401, 'Invalid refresh token', 'INVALID_TOKEN');
      }

      const appUser = toAppUser(user);
      res.json({
        user: appUser,
        accessToken: createAccessToken(appUser, config),
      });
    }),
  );

  router.post('/logout', (_req, res) => {
    res.clearCookie('refreshToken');
    res.status(204).send();
  });

  router.get('/me', requireAuth(config), (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}

function toAppUser(user: UserRecord): AppUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    supplierId: user.supplierId,
  };
}
