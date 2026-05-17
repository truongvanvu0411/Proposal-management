import type { ErrorRequestHandler, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = 'API_ERROR',
    public details?: unknown,
  ) {
    super(message);
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const field = firstIssue?.path?.join('.');
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: firstIssue
          ? `${field ? `${field}: ` : ''}${firstIssue.message}`
          : 'Invalid request payload',
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const fields = getPrismaConstraintFields(error.meta).join(', ') || 'field';
      res.status(409).json({
        error: {
          code: 'UNIQUE_CONSTRAINT_FAILED',
          message: `${fields} already exists`,
          details: error.meta,
        },
      });
      return;
    }

    if (error.code === 'P2003') {
      res.status(400).json({
        error: {
          code: 'FOREIGN_KEY_CONSTRAINT_FAILED',
          message: 'Related record was not found',
          details: error.meta,
        },
      });
      return;
    }

    if (error.code === 'P2025') {
      res.status(404).json({
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Record not found',
          details: error.meta,
        },
      });
      return;
    }
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error',
    },
  });
};

function getPrismaConstraintFields(meta: unknown) {
  const directTarget = typeof meta === 'object' && meta !== null && 'target' in meta
    ? (meta as { target?: unknown }).target
    : undefined;
  if (Array.isArray(directTarget)) {
    return directTarget.map((field) => String(field).replace(/"/g, ''));
  }

  const driverFields =
    typeof meta === 'object' && meta !== null && 'driverAdapterError' in meta
      ? (meta as {
          driverAdapterError?: {
            cause?: {
              constraint?: {
                fields?: unknown;
              };
            };
          };
        }).driverAdapterError?.cause?.constraint?.fields
      : undefined;
  return Array.isArray(driverFields)
    ? driverFields.map((field) => String(field).replace(/"/g, ''))
    : [];
}
