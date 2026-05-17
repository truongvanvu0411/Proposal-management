import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig, DatabaseClient, StorageService } from '../types';
import { requireAuth } from '../auth/middleware';
import { asyncHandler } from '../shared/asyncHandler';
import { ApiError } from '../shared/errors';
import { validateBody } from '../shared/validation';
import { writeAuditLog } from '../shared/audit';

const ownerTypes = ['PRODUCT', 'PROJECT', 'PROPOSAL', 'USER'] as const;

const presignSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(150),
  sizeBytes: z.number().int().positive(),
  ownerType: z.enum(ownerTypes).optional(),
  ownerId: z.string().uuid().optional(),
});

const completeSchema = z.object({
  fileId: z.string().uuid(),
  checksum: z.string().max(200).optional(),
});

export function createFilesRouter(
  db: DatabaseClient,
  storage: StorageService,
  config: AppConfig,
) {
  const router = Router();
  router.use(requireAuth(config));

  router.post(
    '/presign-upload',
    validateBody(presignSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof presignSchema>;
      if (body.sizeBytes > config.maxUploadBytes) {
        throw new ApiError(413, 'File is too large', 'FILE_TOO_LARGE', {
          maxUploadBytes: config.maxUploadBytes,
        });
      }

      const extension = path.extname(body.fileName).toLowerCase();
      const objectKey = [
        'uploads',
        body.ownerType?.toLowerCase() ?? 'unassigned',
        new Date().toISOString().slice(0, 10),
        `${randomUUID()}${extension}`,
      ].join('/');

      const file = await db.file.create({
        data: {
          bucket: config.s3Bucket,
          objectKey,
          originalName: body.fileName,
          mimeType: body.mimeType,
          sizeBytes: body.sizeBytes,
          ownerType: body.ownerType,
          ownerId: body.ownerId,
          uploadedById: req.user?.id,
        },
      });
      const fileId = getId(file);
      const uploadUrl = await storage.createUploadUrl({
        objectKey,
        contentType: body.mimeType,
      });

      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'FILE_PRESIGN_UPLOAD',
        entityType: 'File',
        entityId: fileId,
        metadata: { objectKey },
      });

      res.status(201).json({ file, uploadUrl });
    }),
  );

  router.post(
    '/complete-upload',
    validateBody(completeSchema),
    asyncHandler(async (req, res) => {
      const { fileId, checksum } = req.body as z.infer<typeof completeSchema>;
      const file = (await db.file.findUnique({ where: { id: fileId } })) as
        | { id: string; objectKey: string }
        | null;

      if (!file) {
        throw new ApiError(404, 'File not found', 'FILE_NOT_FOUND');
      }

      await storage.assertObjectExists(file.objectKey);
      const updatedFile = await db.file.update({
        where: { id: fileId },
        data: { status: 'READY', checksum },
      });

      await writeAuditLog(db, {
        actorId: req.user?.id,
        action: 'FILE_COMPLETE_UPLOAD',
        entityType: 'File',
        entityId: fileId,
      });

      res.json({ file: updatedFile });
    }),
  );

  router.get(
    '/:id/download-url',
    asyncHandler(async (req, res) => {
      const file = (await db.file.findUnique({ where: { id: req.params.id } })) as
        | { id: string; objectKey: string; status: string; deletedAt?: Date | null }
        | null;

      if (!file || file.deletedAt || file.status !== 'READY') {
        throw new ApiError(404, 'File not found', 'FILE_NOT_FOUND');
      }

      const downloadUrl = await storage.createDownloadUrl({
        objectKey: file.objectKey,
      });
      res.json({ downloadUrl });
    }),
  );

  return router;
}

function getId(value: unknown) {
  return typeof value === 'object' && value !== null && 'id' in value
    ? String(value.id)
    : undefined;
}
