import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
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
// Rules per plan Module 09: lead chưa liên hệ, follow-up đến hạn, công nợ đến hạn, lớp sắp khai giảng
router.post('/scan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 86400000);
    const created: any[] = [];

    const WARNING_TYPE_LABELS: Record<string, string> = {
      consecutive_absent: 'vắng liên tiếp', low_attendance: 'điểm danh thấp',
      below_standard: 'dưới chuẩn', no_homework: 'không làm BTVN',
      dropout_risk: 'nguy cơ nghỉ',
    };

    // Helper: create notification for all admin/manager users, dedupe by title+day
    const notify = async (type: string, title: string, content: string) => {
      const users = await prisma.user.findMany({
        where: { roles: { some: { role: { name: { in: ['admin', 'manager'] } } } } },
        select: { id: true },
      });
      for (const u of users) {
        const existing = await prisma.notification.findFirst({
          where: { userId: u.id, title, createdAt: { gte: new Date(now.getTime() - 86400000) } },
        });
        if (!existing) {
          await prisma.notification.create({ data: { userId: u.id, type, title, content } });
          created.push(title);
        }
      }
    };

    // Rule 1: Leads mới chưa liên hệ > 2 ngày
    const staleLeads = await prisma.lead.findMany({
      where: { status: { in: ['new', 'assigned'] }, createdAt: { lt: new Date(now.getTime() - 2 * 86400000) } },
      take: 10,
    });
    for (const l of staleLeads) {
      await notify('lead_reminder', `KH tiềm năng ${l.name} chưa được liên hệ`, `KH tiềm năng ${l.code} - ${l.phone} tạo ngày ${l.createdAt.toISOString().slice(0, 10)} chưa có hoạt động.`);
    }

    // Rule 2: Follow-up đến hạn/quá hạn
    const dueFollowUps = await prisma.leadFollowUp.findMany({
      where: { status: 'scheduled', date: { lte: threeDays } },
      include: { lead: { select: { code: true, name: true } } },
      take: 20,
    });
    for (const f of dueFollowUps) {
      const overdue = f.date < now;
      await notify(
        'followup_due',
        `Chăm sóc ${overdue ? 'quá hạn' : 'sắp đến hạn'}: ${f.lead.name}`,
        `KH tiềm năng ${f.lead.code} - hẹn ${f.date.toISOString().slice(0, 10)}${f.content ? ` - ${f.content}` : ''}`
      );
    }

    // Rule 3: Lớp sắp khai giảng trong 7 ngày mà chưa đủ sĩ số
    const sevenDays = new Date(now.getTime() + 7 * 86400000);
    const startingClasses = await prisma.class.findMany({
      where: { status: 'recruiting', startDate: { gte: now, lte: sevenDays } },
    });
    for (const c of startingClasses) {
      if (c.maxStudents && c.studyingStudents < c.maxStudents * 0.5) {
        await notify(
          'class_starting',
          `Lớp ${c.code} sắp khai giảng nhưng thiếu sĩ số`,
          `Khai giảng ${c.startDate.toISOString().slice(0, 10)} - hiện có ${c.studyingStudents}/${c.maxStudents} học viên.`
        );
      }
    }

    // Rule 4: Công nợ đến hạn trong 7 ngày hoặc quá hạn
    const dueReceivables = await prisma.receivable.findMany({
      where: {
        status: { in: ['pending', 'partial'] },
        dueDate: { lte: sevenDays },
      },
      include: {
        student: { select: { code: true, name: true } },
        payments: { where: { status: 'confirmed' }, select: { amount: true } },
      },
      take: 20,
    });
    for (const r of dueReceivables) {
      const paid = r.payments.reduce((s, p) => s + p.amount, 0);
      const remaining = r.totalAmount - paid;
      if (remaining <= 0) continue;
      const overdue = r.dueDate! < now;
      await notify(
        'debt_due',
        `Công nợ ${overdue ? 'quá hạn' : 'sắp đến hạn'}: ${r.student.name}`,
        `${r.student.code} còn nợ ${remaining.toLocaleString('vi-VN')}đ - hạn ${r.dueDate!.toISOString().slice(0, 10)}`
      );
    }

    // Rule 5: Cảnh báo học tập mới chưa xử lý > 3 ngày
    const staleWarnings = await prisma.academicWarning.findMany({
      where: { status: 'new', createdAt: { lt: new Date(now.getTime() - 3 * 86400000) } },
      include: { student: { select: { code: true, name: true } } },
      take: 10,
    });
    for (const w of staleWarnings) {
      await notify(
        'warning_stale',
        `Cảnh báo ${WARNING_TYPE_LABELS[w.type] || w.type} của ${w.student.name} chưa xử lý`,
        `Tạo ngày ${w.createdAt.toISOString().slice(0, 10)} - đã ${Math.floor((now.getTime() - w.createdAt.getTime()) / 86400000)} ngày.`
      );
    }

    // Rule 6: Khóa học sắp kết thúc (class ending within 7 days, still studying)
    const endingClasses = await prisma.class.findMany({
      where: { status: 'studying', endDate: { gte: now, lte: sevenDays } },
    });
    for (const c of endingClasses) {
      await notify(
        'class_ending',
        `Lớp ${c.code} sắp kết thúc`,
        `Kết thúc ${c.endDate.toISOString().slice(0, 10)} - ${c.studyingStudents} học viên cần xử lý tiếp.`
      );
    }

    res.json({ scanned: true, created: created.length, titles: created });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to scan notifications' });
  }
});

export default router;
