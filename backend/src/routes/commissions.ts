import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import { getNum } from '../lib/settings';
import { auditLog } from './admin';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// GET /api/commissions?status=&userId=
router.get('/', requirePermission('commissions', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.userId) where.userId = req.query.userId;

    const data = await prisma.commission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        enrollment: {
          include: {
            student: { select: { id: true, code: true, name: true } },
            course: { select: { code: true, name: true } },
            receivables: { select: { id: true, status: true, totalAmount: true, periodType: true } },
          },
        },
      },
    });
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// POST /api/commissions/check-eligibility — quét tất cả pending, đánh dấu đủ điều kiện chi
// Rule: lớp nhóm → thu đủ 100% các receivable; 1-1 → thu đủ tháng đầu
router.post('/check-eligibility', requirePermission('commissions', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pending = await prisma.commission.findMany({
      where: { status: 'pending' },
      include: {
        enrollment: {
          include: {
            receivables: { select: { status: true, periodType: true } },
          },
        },
      },
    });

    let eligible = 0;
    for (const c of pending) {
      const recv = c.enrollment.receivables;
      const isOneOnOne = c.enrollment.billingType === 'monthly';
      let ok: boolean;
      if (isOneOnOne) {
        // 1-1: chỉ cần khoản tháng đầu (monthly đầu tiên) đã paid
        const firstMonth = recv.find(r => r.periodType === 'monthly') || recv[0];
        ok = firstMonth ? firstMonth.status === 'paid' : false;
      } else {
        // nhóm: tất cả receivable (trừ deposit — cọc không tính) phải paid
        const tuition = recv.filter(r => r.periodType !== 'deposit');
        ok = tuition.length > 0 && tuition.every(r => r.status === 'paid');
      }
      if (ok) {
        await prisma.commission.update({
          where: { id: c.id },
          data: { status: 'eligible', eligibleAt: new Date() },
        });
        await auditLog(req.user!.id, 'commission_eligible', 'Commission', c.id,
          { status: 'pending' }, { status: 'eligible', amount: c.amount, trigger: 'manual_check' });
        eligible++;
      }
    }
    res.json({ checked: pending.length, newlyEligible: eligible });
  } catch (error) {
    res.status(500).json({ error: 'Check failed' });
  }
});

// POST /api/commissions/:id/pay — đánh dấu đã chi
router.post('/:id/pay', requirePermission('commissions', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const c = await prisma.commission.findUnique({ where: { id: req.params.id } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (c.status !== 'eligible') {
      return res.status(409).json({ error: `Chỉ chi khi đủ điều kiện (hiện: ${c.status})` });
    }
    const updated = await prisma.commission.update({
      where: { id: c.id },
      data: { status: 'paid', paidAt: new Date() },
    });
    await auditLog(req.user!.id, 'commission_pay', 'Commission', c.id,
      { status: 'eligible' }, { status: 'paid', amount: c.amount });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to pay' });
  }
});

// GET /api/commissions/clawback-check — sale có ≥N HV bảo lưu → cảnh báo thu hồi
router.get('/clawback-check', requirePermission('commissions', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const threshold = await getNum('clawback_suspend_count', 3);
    const suspended = await prisma.enrollment.groupBy({
      by: ['saleId1', 'saleId2'],
      where: { status: 'suspended' },
      _count: { id: true },
    });

    const alerts: any[] = [];
    for (const s of suspended) {
      for (const key of ['saleId1', 'saleId2'] as const) {
        const uid = s[key];
        if (!uid) continue;
        const count = await prisma.enrollment.count({
          where: { status: 'suspended', OR: [{ saleId1: uid }, { saleId2: uid }] },
        });
        if (count >= threshold) {
          const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, name: true, email: true } });
          const paidCommissions = await prisma.commission.findMany({
            where: { userId: uid, status: 'paid' },
            include: { enrollment: { include: { student: { select: { name: true } } } } },
          });
          alerts.push({
            user,
            suspendedCount: count,
            paidCommissions: paidCommissions.map(c => ({
              id: c.id, amount: c.amount, student: c.enrollment.student.name,
            })),
          });
        }
      }
    }
    res.json({ threshold, alerts: alerts.filter((v, i, a) => a.findIndex(x => x.user?.id === v.user?.id) === i) });
  } catch (error) {
    res.status(500).json({ error: 'Check failed' });
  }
});

export default router;
