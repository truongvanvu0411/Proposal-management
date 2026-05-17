import type { RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';
import type { AppConfig } from '../types';
import { ApiError } from '../shared/errors';
import { verifyAccessToken } from './tokens';

export function requireAuth(config: AppConfig): RequestHandler {
  return (req, _res, next) => {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

    if (!token) {
      next(new ApiError(401, 'Authentication required', 'AUTH_REQUIRED'));
      return;
    }

    try {
      req.user = verifyAccessToken(token, config);
      next();
    } catch {
      next(new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
    }
  };
}

export function requireRole(roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required', 'AUTH_REQUIRED'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, 'Forbidden', 'FORBIDDEN'));
      return;
    }

    next();
  };
}
