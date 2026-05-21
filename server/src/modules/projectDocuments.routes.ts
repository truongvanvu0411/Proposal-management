import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import type { AppConfig, DatabaseClient, StorageService } from '../types';
import { requireAuth, requireRole } from '../auth/middleware';
import { asyncHandler } from '../shared/asyncHandler';
import { ApiError } from '../shared/errors';
import { writeAuditLog } from '../shared/audit';
import {
  buildGeneratedObjectKey,
  documentConfig,
  documentPurposes,
  type DocumentPurpose,
  generateProfitAndLossXlsx,
  generateProposalPptx,
  uploadGeneratedDocument,
} from '../documents/projectDocuments';

const roles = [UserRole.ADMIN, UserRole.PRODUCT_MANAGER, UserRole.SALES];
const generateSchema = z.object({
  force: z.boolean().optional().default(false),
});

export function createProjectDocumentsRouter(
  db: DatabaseClient,
  storage: StorageService,
  config: AppConfig,
) {
  const router = Router();
  router.use(requireAuth(config));
  router.use(requireRole(roles));

  router.get(
    '/:id/documents',
    asyncHandler(async (req, res) => {
      await assertProjectExists(db, req.params.id, {
        userId: req.user?.id,
        role: req.user?.role,
      });
      const files = await findProjectDocuments(db, req.params.id);
      const latest = latestByPurpose(files);
      res.json({
        documents: await Promise.all(
          Object.values(latest).map(async (file) => toDocumentDto(storage, file)),
        ),
      });
    }),
  );

  router.post(
    '/:id/documents/proposal-pptx',
    asyncHandler(async (req, res) => {
      const body = generateSchema.parse(req.body ?? {});
      const result = await generateOrReuseDocument({
        db,
        storage,
        bucket: config.s3Bucket,
        projectId: req.params.id,
        purpose: documentPurposes.proposal,
        force: body.force,
        actorId: req.user?.id,
        actorRole: req.user?.role,
        actorName: req.user?.name ?? '',
      });
      res.status(result.reused ? 200 : 201).json({ document: result.document, reused: result.reused });
    }),
  );

  router.post(
    '/:id/documents/pl-xlsx',
    asyncHandler(async (req, res) => {
      const body = generateSchema.parse(req.body ?? {});
      const result = await generateOrReuseDocument({
        db,
        storage,
        bucket: config.s3Bucket,
        projectId: req.params.id,
        purpose: documentPurposes.profitAndLoss,
        force: body.force,
        actorId: req.user?.id,
        actorRole: req.user?.role,
        actorName: req.user?.name ?? '',
      });
      res.status(result.reused ? 200 : 201).json({ document: result.document, reused: result.reused });
    }),
  );

  return router;
}

async function generateOrReuseDocument(input: {
  db: DatabaseClient;
  storage: StorageService;
  bucket: string;
  projectId: string;
  purpose: DocumentPurpose;
  force: boolean;
  actorId?: string;
  actorRole?: UserRole;
  actorName: string;
}) {
  const project = await getProject(input.db, input.projectId, {
    userId: input.actorId,
    role: input.actorRole,
  });
  const existing = input.force ? null : await findLatestProjectDocument(input.db, input.projectId, input.purpose);
  if (existing) {
    await writeAuditLog(input.db, {
      actorId: input.actorId,
      action: 'DOCUMENT_REUSE',
      entityType: 'File',
      entityId: existing.id,
      metadata: { projectId: input.projectId, purpose: input.purpose, fileId: existing.id },
    });
    return {
      reused: true,
      document: await toDocumentDto(input.storage, existing),
    };
  }

  const config = documentConfig[input.purpose];
  const body =
    input.purpose === documentPurposes.proposal
      ? await generateProposalPptx(project, input.actorName, input.storage)
      : await generatePlWithApiErrors(project);
  const objectKey = buildGeneratedObjectKey(input.projectId, input.purpose);
  await uploadGeneratedDocument(input.storage, {
    objectKey,
    contentType: config.mimeType,
    body,
  });
  const file = await input.db.file.create({
    data: {
      bucket: input.bucket,
      objectKey,
      originalName: `${sanitizeFileName(project.title)}-${config.label}.${config.extension}`,
      mimeType: config.mimeType,
      sizeBytes: body.length,
      status: 'READY',
      ownerType: 'PROJECT',
      ownerId: input.projectId,
      purpose: input.purpose,
      uploadedById: input.actorId,
    },
  });

  await writeAuditLog(input.db, {
    actorId: input.actorId,
    action: 'DOCUMENT_GENERATE',
    entityType: 'File',
    entityId: file.id,
    metadata: { projectId: input.projectId, purpose: input.purpose, fileId: file.id },
  });

  return {
    reused: false,
    document: await toDocumentDto(input.storage, file),
  };
}

async function generatePlWithApiErrors(project: any) {
  try {
    return await generateProfitAndLossXlsx(project);
  } catch (error) {
    if (error instanceof Error && error.name === 'PL_TEMPLATE_ROW_LIMIT_EXCEEDED') {
      throw new ApiError(
        400,
        'P/L template supports up to 12 products',
        'PL_TEMPLATE_ROW_LIMIT_EXCEEDED',
      );
    }
    throw error;
  }
}

async function getProject(
  db: DatabaseClient,
  projectId: string,
  viewer?: { userId?: string; role?: UserRole },
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: projectInclude,
  });
  if (!project || project.deletedAt) {
    throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }
  if (viewer?.role === UserRole.SALES && project.assignedSalesUserId !== viewer.userId) {
    throw new ApiError(403, 'Sales user cannot access documents for this project', 'PROJECT_DOCUMENT_FORBIDDEN');
  }
  return project;
}

async function assertProjectExists(db: DatabaseClient, projectId: string, viewer?: { userId?: string; role?: UserRole }) {
  await getProject(db, projectId, viewer);
}

async function findProjectDocuments(db: DatabaseClient, projectId: string) {
  return db.file.findMany({
    where: {
      ownerType: 'PROJECT',
      ownerId: projectId,
      purpose: { in: Object.values(documentPurposes) },
      status: 'READY',
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function findLatestProjectDocument(db: DatabaseClient, projectId: string, purpose: DocumentPurpose) {
  return db.file.findFirst({
    where: {
      ownerType: 'PROJECT',
      ownerId: projectId,
      purpose,
      status: 'READY',
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });
}

function latestByPurpose(files: any[]) {
  return files.reduce<Record<string, any>>((acc, file) => {
    if (file.purpose && !acc[file.purpose]) {
      acc[file.purpose] = file;
    }
    return acc;
  }, {});
}

async function toDocumentDto(_storage: StorageService, file: any) {
  return {
    id: file.id,
    purpose: file.purpose,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    createdAt: file.createdAt,
    downloadUrl: `/api/files/${encodeURIComponent(file.id)}/content`,
  };
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || 'project';
}

const projectInclude = {
  client: true,
  products: {
    include: {
      product: {
        include: {
          category: true,
          supplier: true,
          images: {
            where: { file: { status: 'READY', deletedAt: null } },
            include: { file: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
    orderBy: { displayOrder: 'asc' },
  },
  orderRequests: true,
};
