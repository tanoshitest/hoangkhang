import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// ==================== TEACHER RATES ====================

// GET /api/payroll/rates?teacherId= - Rate history (never overwritten)
router.get('/rates', requirePermission('teachers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.teacherId) where.teacherId = req.query.teacherId;

    const rates = await prisma.teacherRate.findMany({
      where,
      orderBy: [{ teacherId: 'asc' }, { effectiveFrom: 'desc' }],
      include: { teacher: { select: { id: true, code: true, name: true } } },
    });
    res.json({ data: rates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

// POST /api/payroll/rates - Add new rate version (old rates kept intact)
router.post('/rates', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacherId, classType, role, rate, effectiveFrom, effectiveTo } = req.body;
    if (!teacherId || !role || rate === undefined || !effectiveFrom) {
      return res.status(400).json({ error: 'teacherId, role, rate, effectiveFrom required' });
    }
    if (rate <= 0) return res.status(400).json({ error: 'rate must be positive' });

    const from = new Date(effectiveFrom);
    const to = effectiveTo ? new Date(effectiveTo) : null;
    if (to && to <= from) {
      return res.status(400).json({ error: 'effectiveTo must be after effectiveFrom' });
    }

    // Close overlapping open-ended rates of same classType+role (versioning, not overwrite)
    await prisma.teacherRate.updateMany({
      where: {
        teacherId,
        role,
        classType: classType || null,
        effectiveTo: null,
        effectiveFrom: { lt: from },
      },
      data: { effectiveTo: from },
    });

    const newRate = await prisma.teacherRate.create({
      data: {
        teacherId,
        classType: classType || null,
        role,
        rate,
        effectiveFrom: from,
        effectiveTo: to,
        approvedBy: req.user!.id,
      },
      include: { teacher: { select: { id: true, code: true, name: true } } },
    });
    res.status(201).json(newRate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create rate' });
  }
});

// ==================== PAYROLL PERIODS ====================

// GET /api/payroll/periods - List payroll periods
router.get('/periods', requirePermission('teachers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.teacherId) where.teacherId = req.query.teacherId;
    if (req.query.status) where.status = req.query.status;

    const periods = await prisma.teacherPayrollPeriod.findMany({
      where,
      orderBy: { periodStart: 'desc' },
      include: {
        teacher: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
    });
    res.json({ data: periods });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll periods' });
  }
});

// GET /api/payroll/periods/:id - Period detail with items
router.get('/periods/:id', requirePermission('teachers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const period = await prisma.teacherPayrollPeriod.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: { select: { id: true, code: true, name: true, phone: true } },
        items: {
          orderBy: { date: 'asc' },
          include: {
            session: {
              include: { class: { select: { id: true, code: true } } },
            },
          },
        },
      },
    });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    res.json(period);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch period' });
  }
});

// POST /api/payroll/periods/generate - Generate payroll from sessions in date range
router.post('/periods/generate', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacherId, periodStart, periodEnd } = req.body;
    if (!teacherId || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'teacherId, periodStart, periodEnd required' });
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    end.setHours(23, 59, 59, 999);
    if (end <= start) return res.status(400).json({ error: 'periodEnd must be after periodStart' });

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    // Find taught sessions in range (not already in a confirmed/paid period)
    const sessions = await prisma.session.findMany({
      where: {
        teacherId,
        date: { gte: start, lte: end },
        status: { in: ['taught', 'makeup'] },
      },
      include: {
        class: { select: { code: true, format: true } },
        payrollItems: {
          where: { period: { status: { in: ['confirmed', 'paid'] } } },
        },
      },
      orderBy: { date: 'asc' },
    });

    const billableSessions = sessions.filter(s => s.payrollItems.length === 0);

    // Resolve rate per session date (rate effective at session date, role=main)
    const rates = await prisma.teacherRate.findMany({
      where: { teacherId, role: 'main' },
      orderBy: { effectiveFrom: 'desc' },
    });
    const rateFor = (date: Date, classType: string | null) => {
      const r = rates.find(rt =>
        rt.effectiveFrom <= date &&
        (!rt.effectiveTo || rt.effectiveTo > date) &&
        (rt.classType === null || rt.classType === classType)
      ) || rates.find(rt =>
        rt.effectiveFrom <= date &&
        (!rt.effectiveTo || rt.effectiveTo > date) &&
        rt.classType === null
      );
      return r?.rate || 0;
    };

    const hoursFor = (s: typeof sessions[0]) => {
      if (s.calculatedHours) return s.calculatedHours;
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
    };

    const items = billableSessions.map(s => {
      const hours = hoursFor(s);
      const rate = rateFor(s.date, s.class.format);
      return {
        sessionId: s.id,
        type: s.status === 'makeup' ? 'makeup' : 'regular',
        date: s.date,
        hours,
        rate,
        amount: hours * rate,
        description: `${s.class.code} • ${s.startTime}-${s.endTime}`,
      };
    });

    const totalHours = items.reduce((s, i) => s + i.hours, 0);
    const totalAmount = items.reduce((s, i) => s + i.amount, 0);

    const period = await prisma.teacherPayrollPeriod.create({
      data: {
        teacherId,
        periodStart: start,
        periodEnd: end,
        status: 'draft',
        totalHours,
        totalAmount,
        items: { create: items },
      },
      include: {
        teacher: { select: { id: true, code: true, name: true } },
        items: true,
      },
    });

    res.status(201).json(period);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate payroll' });
  }
});

// POST /api/payroll/periods/:id/items - Manual adjustment item (cộng/trừ)
router.post('/periods/:id/items', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const period = await prisma.teacherPayrollPeriod.findUnique({ where: { id: req.params.id } });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    if (period.status !== 'draft') {
      return res.status(409).json({ error: 'Cannot modify confirmed/paid period' });
    }

    const { type, hours, amount, description, date } = req.body;
    if (amount === undefined) {
      return res.status(400).json({ error: 'amount required' });
    }

    const item = await prisma.teacherPayrollItem.create({
      data: {
        periodId: period.id,
        type: type || 'adjustment',
        date: date ? new Date(date) : new Date(),
        hours: hours || 0,
        rate: 0,
        amount,
        description,
      },
    });

    const newTotal = period.totalAmount + amount;
    const newHours = period.totalHours + (hours || 0);
    await prisma.teacherPayrollPeriod.update({
      where: { id: period.id },
      data: { totalAmount: newTotal, totalHours: newHours },
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// DELETE /api/payroll/periods/:periodId/items/:itemId - Remove item (draft only)
router.delete('/periods/:periodId/items/:itemId', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const period = await prisma.teacherPayrollPeriod.findUnique({ where: { id: req.params.periodId } });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    if (period.status !== 'draft') {
      return res.status(409).json({ error: 'Cannot modify confirmed/paid period' });
    }

    const item = await prisma.teacherPayrollItem.findUnique({ where: { id: req.params.itemId } });
    if (!item || item.periodId !== period.id) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await prisma.teacherPayrollItem.delete({ where: { id: item.id } });
    await prisma.teacherPayrollPeriod.update({
      where: { id: period.id },
      data: {
        totalAmount: period.totalAmount - item.amount,
        totalHours: period.totalHours - item.hours,
      },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// POST /api/payroll/periods/:id/confirm - Confirm payroll
router.post('/periods/:id/confirm', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const period = await prisma.teacherPayrollPeriod.findUnique({ where: { id: req.params.id } });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    if (period.status !== 'draft') {
      return res.status(409).json({ error: `Period already ${period.status}` });
    }

    const updated = await prisma.teacherPayrollPeriod.update({
      where: { id: period.id },
      data: { status: 'confirmed', confirmedBy: req.user!.id, confirmedAt: new Date() },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm period' });
  }
});

// POST /api/payroll/periods/:id/pay - Mark paid
router.post('/periods/:id/pay', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const period = await prisma.teacherPayrollPeriod.findUnique({ where: { id: req.params.id } });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    if (period.status !== 'confirmed') {
      return res.status(409).json({ error: 'Period must be confirmed before payment' });
    }

    const updated = await prisma.teacherPayrollPeriod.update({
      where: { id: period.id },
      data: { status: 'paid', paidAt: new Date() },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark paid' });
  }
});

// ==================== TEACHER AVAILABILITY ====================

// GET /api/payroll/availability?teacherId=
router.get('/availability', requirePermission('teachers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.teacherId) where.teacherId = req.query.teacherId;

    const availability = await prisma.teacherAvailability.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: { teacher: { select: { id: true, code: true, name: true } } },
    });
    res.json({ data: availability });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// POST /api/payroll/availability - Add availability slot
router.post('/availability', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacherId, dayOfWeek, startTime, endTime } = req.body;
    if (teacherId === undefined || dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: 'teacherId, dayOfWeek, startTime, endTime required' });
    }
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'dayOfWeek must be 0-6' });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'startTime must be before endTime' });
    }

    const slot = await prisma.teacherAvailability.create({
      data: { teacherId, dayOfWeek, startTime, endTime },
    });
    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add availability' });
  }
});

// DELETE /api/payroll/availability/:id
router.delete('/availability/:id', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.teacherAvailability.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete availability' });
  }
});

// ==================== TEACHER WORKLOAD ====================

// GET /api/payroll/workload?teacherId=&from=&to= - Teaching hours summary
router.get('/workload', requirePermission('teachers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacherId, from, to } = req.query;
    const where: any = { status: { in: ['taught', 'makeup'] } };
    if (teacherId) where.teacherId = teacherId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        teacher: { select: { id: true, code: true, name: true } },
        class: { select: { code: true } },
      },
      orderBy: { date: 'asc' },
    });

    const byTeacher: Record<string, any> = {};
    for (const s of sessions) {
      const hours = s.calculatedHours ||
        Math.max(0, (parseInt(s.endTime) * 60 + parseInt(s.endTime.split(':')[1] || '0')
          - parseInt(s.startTime) * 60 - parseInt(s.startTime.split(':')[1] || '0')) / 60);
      if (!byTeacher[s.teacherId]) {
        byTeacher[s.teacherId] = {
          teacher: s.teacher,
          totalHours: 0,
          sessionCount: 0,
          sessions: [],
        };
      }
      byTeacher[s.teacherId].totalHours += hours;
      byTeacher[s.teacherId].sessionCount += 1;
      byTeacher[s.teacherId].sessions.push({
        id: s.id, date: s.date, startTime: s.startTime, endTime: s.endTime,
        hours, class: s.class, status: s.status,
      });
    }

    res.json({ data: Object.values(byTeacher) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workload' });
  }
});

export default router;
