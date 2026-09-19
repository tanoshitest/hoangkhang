import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types';
import { computeEnrollmentFee } from '../lib/fees';
import { getNum } from '../lib/settings';
import { auditLog } from './admin';

const router = Router();
const prisma = new PrismaClient();

const enrollSchema = z.object({
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  classType: z.enum(['group', 'one_on_one']),
  classId: z.string().optional().nullable(),
  priceTier: z.enum(['2-5', '6-10']).optional().nullable(),
  discounts: z.array(z.object({
    type: z.enum(['full_course', 'relative', 'ctv', 'promo']),
    note: z.string().optional(),
  })).optional(),
  promoPct: z.number().min(0).max(1).optional(),
  monthlyHours: z.number().positive().optional().nullable(),
  hasDeposit: z.boolean().optional(),
  saleId1: z.string().optional().nullable(),
  saleId2: z.string().optional().nullable(),
  leadType: z.enum(['center', 'self_sourced', 'ctv']).optional().nullable(),
  ctvType: z.enum(['none', 'ctv_enrolled', 'ctv_not_enrolled']).optional().nullable(),
  ctvName: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
});

async function generateEnrollmentCode(): Promise<string> {
  const count = await prisma.enrollment.count();
  return `GD${String(count + 1).padStart(4, '0')}`;
}

// POST /api/enrollments/preview - Fee preview, no DB write
router.post('/preview', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = enrollSchema.omit({ studentId: true }).parse(req.body);
    const fee = await computeEnrollmentFee(data);
    res.json(fee);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(400).json({ error: error.message || 'Preview failed' });
  }
});

// GET /api/enrollments - List
router.get('/', requirePermission('students', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, studentId, classId } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;
    if (classId) where.classId = classId;

    const enrollments = await prisma.enrollment.findMany({
      where,
      orderBy: { enrolledAt: 'desc' },
      include: {
        student: { select: { id: true, code: true, name: true, phone: true } },
        course: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, code: true, name: true } },
        sale1: { select: { id: true, name: true } },
        receivables: { select: { id: true, status: true, totalAmount: true, periodType: true, periodLabel: true } },
        events: { orderBy: { effectiveDate: 'desc' }, take: 5 },
      },
    });
    res.json({ data: enrollments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// GET /api/enrollments/:id - Detail
router.get('/:id', requirePermission('students', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { id: true, code: true, name: true, phone: true, email: true } },
        course: true,
        class: true,
        sale1: { select: { id: true, name: true } },
        sale2: { select: { id: true, name: true } },
        receivables: {
          orderBy: { createdAt: 'asc' },
          include: { payments: { where: { status: 'confirmed' }, select: { amount: true } } },
        },
        commissions: true,
        events: { orderBy: { effectiveDate: 'desc' } },
      },
    });
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    res.json(enrollment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enrollment' });
  }
});

// POST /api/enrollments - Create enrollment + receivables + commissions
router.post('/', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = enrollSchema.parse(req.body);

    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Duplicate guard: same student + course + active status
    const dup = await prisma.enrollment.findFirst({
      where: { studentId: data.studentId, courseId: data.courseId, status: { in: ['reserved', 'studying', 'suspended'] } },
    });
    if (dup) return res.status(409).json({ error: `Học viên đã có ghi danh đang hiệu lực cho khóa này (${dup.code || dup.id.slice(0, 8)})` });

    const fee = await computeEnrollmentFee(data);

    const result = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.create({
        data: {
          code: await generateEnrollmentCode(),
          studentId: data.studentId,
          courseId: data.courseId,
          classId: data.classId || null,
          status: data.classId ? 'studying' : 'reserved',
          startDate: data.startDate ? new Date(data.startDate) : null,
          classType: fee.classType,
          priceTier: fee.priceTier,
          billingType: fee.billingType,
          totalHours: fee.totalHours,
          unitPrice: fee.unitPrice,
          grossFee: fee.grossFee,
          discountDetail: fee.discountDetail.length ? JSON.stringify(fee.discountDetail) : null,
          discountPct: fee.discountPct,
          finalFee: fee.finalFee,
          depositApplied: 0,
          monthlyHours: data.monthlyHours || null,
          revenuePerHour: fee.revenuePerHour,
          saleId1: data.saleId1 || null,
          saleId2: data.saleId2 || null,
          leadType: data.leadType || null,
          ctvType: data.ctvType || null,
          ctvName: data.ctvName || null,
        },
      });

      // Receivables per billing periods
      for (const p of fee.periods) {
        await tx.receivable.create({
          data: {
            studentId: data.studentId,
            courseId: data.courseId,
            enrollmentId: enrollment.id,
            standardFee: p.amount,
            totalAmount: p.amount,
            periodType: p.periodType,
            periodLabel: p.periodLabel,
            dueDate: p.dueDate || null,
            status: 'pending',
          },
        });
      }

      // Xếp lớp ngay nếu có classId
      if (data.classId) {
        await tx.classMember.create({
          data: { classId: data.classId, studentId: data.studentId, status: 'active' },
        });
        await tx.class.update({
          where: { id: data.classId },
          data: { currentStudents: { increment: 1 }, studyingStudents: { increment: 1 } },
        });
      }

      // Commission records (pending — đủ điều kiện khi thu đủ, xử lý ở B4)
      const sales = [data.saleId1, data.saleId2].filter(Boolean) as string[];
      if (data.leadType && sales.length) {
        const pct = await getNum(
          data.leadType === 'self_sourced' ? 'commission_self_sourced' : 'commission_center_lead',
          data.leadType === 'self_sourced' ? 0.1 : 0.05
        );
        const base = fee.classType === 'one_on_one' && data.monthlyHours
          ? data.monthlyHours * fee.unitPrice
          : fee.finalFee;
        const share = base * pct / sales.length;
        for (const saleId of sales) {
          await tx.commission.create({
            data: {
              enrollmentId: enrollment.id,
              userId: saleId,
              type: data.leadType === 'self_sourced' ? 'self_sourced' : 'center_lead',
              baseAmount: base,
              pct,
              amount: share,
              status: 'pending',
            },
          });
        }
      }
      // CTV không học → HH 5% trả cho CTV (không phải user)
      if (data.ctvType === 'ctv_not_enrolled' && data.ctvName) {
        const pct = await getNum('commission_ctv_not_enrolled', 0.05);
        const base = fee.finalFee;
        await tx.commission.create({
          data: {
            enrollmentId: enrollment.id,
            userId: null,
            ctvName: data.ctvName,
            type: 'ctv_referral',
            baseAmount: base,
            pct,
            amount: base * pct,
            status: 'pending',
          },
        });
      }

      await tx.enrollmentEvent.create({
        data: {
          enrollmentId: enrollment.id,
          type: 'enroll',
          effectiveDate: new Date(),
          reason: `fee=${fee.finalFee} tier=${fee.priceTier || '1-1'} disc=${fee.discountPct}`,
          createdBy: req.user?.id || 'system',
        },
      });

      // Student status: có lớp → studying, chưa → waiting_class
      await tx.student.update({
        where: { id: data.studentId },
        data: {
          status: data.classId ? 'studying' : 'waiting_class',
          currentCourse: course.name,
          currentClass: data.classId ? (await tx.class.findUnique({ where: { id: data.classId } }))?.code : student.currentClass,
        },
      });

      return enrollment;
    });

    await auditLog(req.user!.id, 'create', 'enrollment', result.id, null, {
      studentId: data.studentId, courseId: data.courseId, finalFee: fee.finalFee,
    });

    const full = await prisma.enrollment.findUnique({
      where: { id: result.id },
      include: { receivables: true, commissions: true, course: true, class: true },
    });
    res.status(201).json(full);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(400).json({ error: error.message || 'Failed to create enrollment' });
  }
});

// POST /api/enrollments/:id/transition - status transitions
router.post('/:id/transition', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, classId, reason } = req.body;
    const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    const data: any = {};
    let eventType = '';
    switch (action) {
      case 'assign_class': {
        if (!classId) return res.status(400).json({ error: 'classId required' });
        const cls = await prisma.class.findUnique({ where: { id: classId } });
        if (!cls) return res.status(404).json({ error: 'Class not found' });
        data.classId = classId;
        data.status = 'studying';
        eventType = 'assign_class';
        await prisma.classMember.create({ data: { classId, studentId: enrollment.studentId, status: 'active' } });
        await prisma.class.update({ where: { id: classId }, data: { currentStudents: { increment: 1 }, studyingStudents: { increment: 1 } } });
        break;
      }
      case 'suspend': {
        const months = await getNum('reserve_months', 3);
        const now = new Date();
        const until = new Date(now);
        until.setMonth(until.getMonth() + months);
        data.status = 'suspended';
        data.suspendDate = now;
        data.suspendUntil = until;
        eventType = 'reserve';
        break;
      }
      case 'resume':
        data.status = enrollment.classId ? 'studying' : 'reserved';
        data.suspendDate = null;
        data.suspendUntil = null;
        eventType = 'resume';
        break;
      case 'drop':
        data.status = 'dropped';
        eventType = 'drop';
        break;
      case 'complete':
        data.status = 'completed';
        data.endDate = new Date();
        eventType = 'complete';
        break;
      default:
        return res.status(400).json({ error: 'action must be assign_class|suspend|resume|drop|complete' });
    }

    const updated = await prisma.enrollment.update({ where: { id: enrollment.id }, data });
    await prisma.enrollmentEvent.create({
      data: { enrollmentId: enrollment.id, type: eventType, effectiveDate: new Date(), reason: reason || null, createdBy: req.user?.id || 'system' },
    });
    await auditLog(req.user!.id, 'update', 'enrollment', enrollment.id, { status: enrollment.status }, { status: updated.status, action });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update enrollment' });
  }
});

export default router;
