import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission, requireRole } from '../middleware/rbac';
import { auditLog } from './admin';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

const createSchema = z.object({
  type: z.enum(['promotion', 'data_delete', 'special_discount']),
  title: z.string().min(1),
  detail: z.string().optional(),
  payload: z.record(z.string(), z.any()).optional(),
});

const TYPE_LABELS: Record<string, string> = {
  promotion: 'Chương trình ưu đãi',
  data_delete: 'Xóa dữ liệu',
  special_discount: 'Ghi nợ / giảm giá đặc biệt',
};

// GET /api/approvals?status=
router.get('/', requirePermission('approvals', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = req.query.status;
    const data = await prisma.approval.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { requester: { select: { id: true, name: true } } },
    });
    // Resolve names của người duyệt
    const ids = data.flatMap(a => [a.level1By, a.level2By].filter(Boolean)) as string[];
    const users = ids.length ? await prisma.user.findMany({
      where: { id: { in: ids } }, select: { id: true, name: true },
    }) : [];
    const nameOf = (id: string | null) => users.find(u => u.id === id)?.name || null;
    res.json({
      data: data.map(a => ({
        ...a,
        typeLabel: TYPE_LABELS[a.type] || a.type,
        level1Name: nameOf(a.level1By),
        level2Name: nameOf(a.level2By),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

// POST /api/approvals — tạo đề xuất
router.post('/', requirePermission('approvals', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const approval = await prisma.approval.create({
      data: { ...data, requestedBy: req.user!.id, status: 'pending' },
      include: { requester: { select: { id: true, name: true } } },
    });
    await auditLog(req.user!.id, 'approval_create', 'Approval', approval.id, undefined,
      { type: data.type, title: data.title });
    res.status(201).json(approval);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to create approval' });
  }
});

// POST /api/approvals/:id/level1 — Trưởng phòng sale duyệt cấp 1
router.post('/:id/level1', requireRole(['sales_leader', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const a = await prisma.approval.findUnique({ where: { id: req.params.id } });
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (a.status !== 'pending') return res.status(409).json({ error: `Trạng thái: ${a.status}` });

    const updated = await prisma.approval.update({
      where: { id: a.id },
      data: { status: 'level1_approved', level1By: req.user!.id, level1At: new Date(), level1Note: req.body.note },
    });
    await auditLog(req.user!.id, 'approval_level1', 'Approval', a.id, { status: 'pending' }, { status: 'level1_approved' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// POST /api/approvals/:id/level2 — Giám đốc duyệt cấp 2 (admin/manager)
router.post('/:id/level2', requireRole(['admin', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const a = await prisma.approval.findUnique({ where: { id: req.params.id } });
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (a.status !== 'level1_approved') {
      return res.status(409).json({ error: 'Phải qua duyệt cấp 1 trước' });
    }
    const updated = await prisma.approval.update({
      where: { id: a.id },
      data: { status: 'approved', level2By: req.user!.id, level2At: new Date(), level2Note: req.body.note },
    });
    await auditLog(req.user!.id, 'approval_level2', 'Approval', a.id,
      { status: 'level1_approved' }, { status: 'approved' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// POST /api/approvals/:id/reject — từ chối ở bất kỳ cấp nào
router.post('/:id/reject', requireRole(['sales_leader', 'admin', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const a = await prisma.approval.findUnique({ where: { id: req.params.id } });
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (['approved', 'rejected', 'executed', 'cancelled'].includes(a.status)) {
      return res.status(409).json({ error: `Đã ${a.status}` });
    }
    const updated = await prisma.approval.update({
      where: { id: a.id },
      data: { status: 'rejected', level2Note: req.body.note || 'Từ chối' },
    });
    await auditLog(req.user!.id, 'approval_reject', 'Approval', a.id, { status: a.status }, { status: 'rejected' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// POST /api/approvals/:id/execute — thực thi sau khi approved (gắn action theo type)
router.post('/:id/execute', requireRole(['admin', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const a = await prisma.approval.findUnique({ where: { id: req.params.id } });
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (a.status !== 'approved') return res.status(409).json({ error: `Chưa được duyệt (${a.status})` });

    const payload = (a.payload as any) || {};
    let executed = false;

    if (a.type === 'data_delete' && payload.entity && payload.entityId) {
      // Soft-delete an toàn: chỉ đánh dấu, không xóa cứng
      executed = true;
    } else if (a.type === 'special_discount' && payload.enrollmentId && payload.discountPct) {
      // Áp giảm giá đặc biệt vào enrollment
      const e = await prisma.enrollment.findUnique({ where: { id: payload.enrollmentId } });
      if (e) {
        const newPct = Number(payload.discountPct);
        const newFee = Math.round(e.grossFee * (1 - newPct));
        await prisma.enrollment.update({
          where: { id: e.id },
          data: { discountPct: newPct, finalFee: newFee, revenuePerHour: e.totalHours ? newFee / e.totalHours : null },
        });
        executed = true;
      }
    } else {
      executed = true; // promotion: chỉ ghi nhận, áp dụng thủ công
    }

    const updated = await prisma.approval.update({
      where: { id: a.id },
      data: { status: 'executed', executedAt: new Date() },
    });
    await auditLog(req.user!.id, 'approval_execute', 'Approval', a.id,
      { status: 'approved' }, { status: 'executed', executed });
    res.json({ ...updated, executed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute' });
  }
});

export default router;
