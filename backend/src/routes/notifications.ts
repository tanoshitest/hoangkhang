import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { runReminderScan } from '../lib/reminders';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// GET /api/notifications - My notifications
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    res.json({ data: notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications/:id/read - Mark read
router.post('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notification = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// POST /api/notifications/read-all - Mark all read
router.post('/read-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all read' });
  }
});

// POST /api/notifications/scan - Run notification rules, create notifications
// Logic dùng chung với scheduler tự động (lib/reminders.ts)
router.post('/scan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await runReminderScan();
    res.json({ scanned: true, ...result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to scan notifications' });
  }
});

export default router;
