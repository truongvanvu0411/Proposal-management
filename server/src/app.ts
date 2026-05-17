import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import type { AppDependencies } from './types';
import { getConfig } from './config/env';
import { getPrisma } from './db/prisma';
import { createS3Storage } from './storage/s3Storage';
import { createAuthRouter } from './modules/auth.routes';
import { createUsersRouter } from './modules/users.routes';
import { createClientRouter, createSupplierRouter } from './modules/masterData.routes';
import { createFilesRouter } from './modules/files.routes';
import { createProductsRouter } from './modules/products.routes';
import { createProjectsRouter } from './modules/projects.routes';
import { createExportsRouter } from './modules/exports.routes';
import { createProjectDocumentsRouter } from './modules/projectDocuments.routes';
import { createNotificationsRouter } from './modules/notifications.routes';
import { errorHandler, notFoundHandler } from './shared/errors';

export function createApp(dependencies: AppDependencies = {}) {
  const config = dependencies.config ?? getConfig();
  const db = dependencies.db ?? getPrisma();
  const storage = dependencies.storage ?? createS3Storage(config);
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
      exposedHeaders: ['Content-Disposition'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(config.nodeEnv === 'test' ? 'tiny' : 'combined'));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'proposal-management-api',
    });
  });

  app.use('/api/auth', createAuthRouter(db, config));
  app.use('/api/users', createUsersRouter(db, config));
  app.use('/api/suppliers', createSupplierRouter(db, config));
  app.use('/api/clients', createClientRouter(db, config));
  app.use('/api/products', createProductsRouter(db, config, storage));
  app.use('/api/projects', createProjectsRouter(db, config));
  app.use('/api/projects', createProjectDocumentsRouter(db, storage, config));
  app.use('/api/notifications', createNotificationsRouter(db, config));
  app.use('/api/files', createFilesRouter(db, storage, config));
  app.use('/api/exports', createExportsRouter(db, config));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
