import { Router } from 'express';
import type { AppConfig, DatabaseClient } from '../types';
import { requireAuth } from '../auth/middleware';
import { asyncHandler } from '../shared/asyncHandler';
import { ApiError } from '../shared/errors';
import { toDateOnly } from '../shared/dto';

export function createNotificationsRouter(db: DatabaseClient, config: AppConfig) {
  const router = Router();
  router.use(requireAuth(config));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const notifications = await db.notification.findMany({
        where: { userId: req.user?.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const unreadCount = await db.notification.count({
        where: { userId: req.user?.id, readAt: null },
      });
      res.json({
        notifications: notifications.map(toNotificationDto),
        unreadCount,
      });
    }),
  );

  router.post(
    '/:id/read',
    asyncHandler(async (req, res) => {
      const notification = await db.notification.findUnique({ where: { id: req.params.id } });
      if (!notification || notification.userId !== req.user?.id) {
        throw new ApiError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
      }
      const updated = await db.notification.update({
        where: { id: notification.id },
        data: { readAt: notification.readAt ?? new Date() },
      });
      res.json({ notification: toNotificationDto(updated) });
    }),
  );

  return router;
}

export function toNotificationDto(notification: any) {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    projectId: notification.projectId ?? undefined,
    orderId: notification.orderId ?? undefined,
    productId: notification.productId ?? undefined,
    read: Boolean(notification.readAt),
    readAt: notification.readAt ? toDateOnly(notification.readAt) : undefined,
    createdAt: toDateOnly(notification.createdAt),
  };
}
