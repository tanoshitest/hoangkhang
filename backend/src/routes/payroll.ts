import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import { getNum } from '../lib/settings';
import { auditLog } from './admin';
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

// POST /api/payroll/periods/generate - Bảng lương tuần (chốt T7)
// Lớp 1-1: giờ × đơn giá DON_GIA_GV (level × trạng thái GV; fallback: đơn giá riêng GV)
// Lớp nhóm: ratio × revenuePerHour × giờ — ratio = sàn 15% + 2%/HV vượt min,
//           revenuePerHour = Σ(finalFee / totalHours) của các enrollment đang học trong lớp
// Dạy thay: session.teacherId = GV thực dạy → tự trả cho người dạy
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
        class: {
          select: {
            id: true, code: true, format: true, classType: true,
            minStudents: true, currentStudents: true,
            mainTeacherId: true, supportTeacherId: true,
            course: { select: { priceLevel: true, code: true } },
          },
        },
        payrollItems: { select: { id: true } }, // đã nằm trong kỳ lương nào (draft kể cả) → không tạo trùng
      },
      orderBy: { date: 'asc' },
    });

    const billableSessions = sessions.filter(s => s.payrollItems.length === 0);
    const skippedBilled = sessions.length - billableSessions.length;

    // Đơn giá riêng theo GV (legacy, ưu tiên hơn DON_GIA_GV chung)
    const teacherRates = await prisma.teacherRate.findMany({
      where: { teacherId, role: 'main' },
      orderBy: { effectiveFrom: 'desc' },
    });
    const teacherRateFor = (date: Date, classType: string | null) => {
      const r = teacherRates.find(rt =>
        rt.effectiveFrom <= date &&
        (!rt.effectiveTo || rt.effectiveTo > date) &&
        (rt.classType === null || rt.classType === classType)
      );
      return r?.rate || null;
    };

    // DON_GIA_GV chung: teacherId=null, key = level + employmentStatus
    const globalRates = await prisma.teacherRate.findMany({
      where: { teacherId: null },
    });
    const globalRateFor = (level: string | undefined, status: string) => {
      const r = globalRates.find(g => g.level === level && g.employmentStatus === status)
        || globalRates.find(g => g.level === level && g.employmentStatus === 'official');
      return r?.rate || 0;
    };

    // Lương nhóm settings
    const floorRatio = await getNum('group_payroll_floor_ratio', 0.15);
    const extraPerStudent = await getNum('group_payroll_extra_per_student', 0.02);
    const groupMin = await getNum('group_min_students', 2);

    // revenuePerHour theo lớp: Σ(finalFee/totalHours) của enrollments đang học
    const classIds = [...new Set(billableSessions.map(s => s.classId))];
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: { in: classIds }, status: { in: ['studying', 'reserved', 'enrolled'] } },
      select: { classId: true, revenuePerHour: true, finalFee: true, totalHours: true },
    });
    const classRevPerHour: Record<string, number> = {};
    for (const e of enrollments) {
      const rph = e.revenuePerHour ?? (e.totalHours ? e.finalFee / e.totalHours : 0);
      classRevPerHour[e.classId!] = (classRevPerHour[e.classId!] || 0) + rph;
    }

    const hoursFor = (s: typeof sessions[0]) => {
      if (s.calculatedHours) return s.calculatedHours;
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
    };

    const items = billableSessions.map(s => {
      const hours = hoursFor(s);
      const isGroup = s.class.classType !== 'one_on_one';
      // dạy thay: GV thực dạy ≠ GV chính → trả người thực dạy, đánh dấu substitute
      const type = s.status === 'makeup' ? 'makeup'
        : (s.class.mainTeacherId && s.teacherId !== s.class.mainTeacherId) ? 'substitute' : 'teaching';

      if (isGroup) {
        const enrolled = Math.max(s.class.currentStudents, groupMin);
        const ratio = floorRatio + extraPerStudent * Math.max(0, enrolled - groupMin);
        const revenuePerHour = classRevPerHour[s.classId] || 0;
        return {
          sessionId: s.id,
          classId: s.classId,
          type,
          date: s.date,
          hours,
          rate: 0,
          ratio,
          revenuePerHour,
          amount: Math.round(ratio * revenuePerHour * hours),
          description: `${s.class.code} • ${s.startTime}-${s.endTime} • nhóm ${enrolled}HV • ${Math.round(ratio * 100)}% × ${new Intl.NumberFormat('vi-VN').format(Math.round(revenuePerHour))}đ/giờ`,
        };
      }

      // 1-1: giờ × đơn giá (GV riêng → DON_GIA_GV theo level × trạng thái)
      const rate = teacherRateFor(s.date, s.class.format)
        ?? globalRateFor(s.class.course.priceLevel || undefined, teacher.employmentStatus);
      return {
        sessionId: s.id,
        classId: s.classId,
        type,
        date: s.date,
        hours,
        rate,
        amount: Math.round(hours * rate),
        description: `${s.class.code} • ${s.startTime}-${s.endTime} • 1-1 ${s.class.course.priceLevel || ''} • ${new Intl.NumberFormat('vi-VN').format(rate)}đ/giờ (${teacher.employmentStatus === 'probation' ? 'thử việc' : 'chính thức'})`,
      };
    });

    // Thưởng JLPT: HV trong lớp GV phụ trách đậu JLPT trong kỳ
    const bonusJlpt = await getNum('bonus_jlpt_pass', 200000);
    const teacherClassIds = await prisma.class.findMany({
      where: { OR: [{ mainTeacherId: teacherId }, { supportTeacherId: teacherId }] },
      select: { id: true, code: true },
    });
    const tClassIds = teacherClassIds.map(c => c.id);
    const passedStudents = tClassIds.length > 0 ? await prisma.assessment.findMany({
      where: {
        type: 'jlpt_real',
        passed: true,
        date: { gte: start, lte: end },
        student: { classMembers: { some: { classId: { in: tClassIds }, status: 'active' } } },
      },
      include: { student: { select: { code: true, name: true } } },
    }) : [];

    // Chống trùng bonus: đã có item bonus cùng mô tả trong kỳ lương khác của GV này
    const existingBonusDescs = new Set(
      (await prisma.teacherPayrollItem.findMany({
        where: { type: 'bonus', period: { teacherId } },
        select: { description: true },
      })).map(i => i.description).filter(Boolean)
    );

    const bonusItems = passedStudents
      .map(a => ({
      classId: null as string | null,
      type: 'bonus',
      bonusType: 'jlpt_pass',
      bonusAmount: bonusJlpt,
      date: a.date,
      hours: 0,
      rate: 0,
      amount: bonusJlpt,
      description: `Thưởng đậu JLPT — ${a.student.name} (${a.student.code})`,
      }))
      .filter(i => !existingBonusDescs.has(i.description!));

    const allItems = [...items, ...bonusItems];
    const totalHours = allItems.reduce((s, i) => s + i.hours, 0);
    const totalAmount = allItems.reduce((s, i) => s + i.amount, 0);
    const totalBonus = bonusItems.reduce((s, i) => s + i.amount, 0);

    const period = await prisma.teacherPayrollPeriod.create({
      data: {
        teacherId,
        periodStart: start,
        periodEnd: end,
        periodType: 'weekly',
        status: 'draft',
        totalHours,
        totalAmount,
        totalBonus,
        items: { create: allItems.map(({ classId, ...rest }) => ({ ...rest, classId: classId || undefined })) },
      },
      include: {
        teacher: { select: { id: true, code: true, name: true } },
        items: true,
      },
    });

    await auditLog(req.user!.id, 'payroll_generate', 'TeacherPayrollPeriod', period.id,
      undefined, { totalAmount, totalHours, sessions: items.length, bonuses: bonusItems.length, skippedBilled });

    res.status(201).json({ ...period, skippedBilled });
  } catch (error) {
    console.error(error);
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

    const { type, hours, amount, description, date, bonusType, bonusAmount } = req.body;
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
        bonusType: bonusType || null,
        bonusAmount: bonusAmount || 0,
        amount,
        description,
      },
    });

    const isBonus = item.type === 'bonus';
    await prisma.teacherPayrollPeriod.update({
      where: { id: period.id },
      data: {
        totalAmount: period.totalAmount + amount,
        totalHours: period.totalHours + (hours || 0),
        totalBonus: period.totalBonus + (isBonus ? amount : 0),
      },
    });

    await auditLog(req.user!.id, 'payroll_item_add', 'TeacherPayrollItem', item.id,
      undefined, { periodId: period.id, type: item.type, amount });
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
        totalBonus: period.totalBonus - (item.type === 'bonus' ? item.amount : 0),
      },
    });
    await auditLog(req.user!.id, 'payroll_item_delete', 'TeacherPayrollItem', item.id,
      { periodId: period.id, type: item.type, amount: item.amount }, undefined);
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

    // Safety net: session của kỳ này không được nằm trong kỳ confirmed/paid khác
    const dupItems = await prisma.teacherPayrollItem.count({
      where: {
        periodId: period.id,
        sessionId: { not: null },
        OR: [{
          session: {
            payrollItems: { some: { period: { status: { in: ['confirmed', 'paid'] }, id: { not: period.id } } } },
          },
        }],
      },
    });
    if (dupItems > 0) {
      return res.status(409).json({ error: `${dupItems} buổi học đã được trả lương ở kỳ khác — xóa item trùng trước khi chốt` });
    }

    const updated = await prisma.teacherPayrollPeriod.update({
      where: { id: period.id },
      data: { status: 'confirmed', confirmedBy: req.user!.id, confirmedAt: new Date() },
    });
    await auditLog(req.user!.id, 'payroll_confirm', 'TeacherPayrollPeriod', period.id,
      { status: 'draft' }, { status: 'confirmed', totalAmount: period.totalAmount });
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
    await auditLog(req.user!.id, 'payroll_pay', 'TeacherPayrollPeriod', period.id,
      { status: 'confirmed' }, { status: 'paid', totalAmount: period.totalAmount });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark paid' });
  }
});

// DELETE /api/payroll/periods/:id - Xóa kỳ lương draft (để tạo lại)
router.delete('/periods/:id', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const period = await prisma.teacherPayrollPeriod.findUnique({ where: { id: req.params.id } });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    if (period.status !== 'draft') {
      return res.status(409).json({ error: 'Chỉ xóa được kỳ lương ở trạng thái draft' });
    }
    await prisma.teacherPayrollPeriod.delete({ where: { id: period.id } }); // items cascade
    await auditLog(req.user!.id, 'payroll_delete_draft', 'TeacherPayrollPeriod', period.id,
      { status: 'draft', totalAmount: period.totalAmount }, undefined);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete period' });
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
