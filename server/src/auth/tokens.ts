import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import type { AppConfig, AppUser } from '../types';
import { ApiError } from '../shared/errors';

interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  supplierId: string | null;
  tokenType: 'access' | 'refresh';
}

export function createAccessToken(user: AppUser, config: AppConfig) {
  return jwt.sign(toPayload(user, 'access'), config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function createRefreshToken(user: AppUser, config: AppConfig) {
  return jwt.sign(toPayload(user, 'refresh'), config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string, config: AppConfig): AppUser {
  const payload = verifyJwtToken(token, config.jwtAccessSecret);
  if (payload.tokenType !== 'access') {
    throw new ApiError(401, 'Invalid access token', 'INVALID_TOKEN');
  }
  return fromPayload(payload);
}

export function verifyRefreshToken(token: string, config: AppConfig): AppUser {
  const payload = verifyJwtToken(token, config.jwtRefreshSecret);
  if (payload.tokenType !== 'refresh') {
    throw new ApiError(401, 'Invalid refresh token', 'INVALID_TOKEN');
  }
  return fromPayload(payload);
}

function verifyJwtToken(token: string, secret: string): TokenPayload {
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    throw new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }
}

function toPayload(user: AppUser, tokenType: TokenPayload['tokenType']): TokenPayload {
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    supplierId: user.supplierId,
    tokenType,
  };
}

function fromPayload(payload: TokenPayload): AppUser {
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    supplierId: payload.supplierId,
  };
}
