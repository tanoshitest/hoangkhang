import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { saveAttendanceForSession } from './sessions';
import { streamReceiptPdf } from './finance';
import { getNum } from '../lib/settings';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// Guards: tài khoản phải link hồ sơ HV/GV
const requireStudent = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.studentId) {
    return res.status(403).json({ error: 'Tài khoản không gắn hồ sơ học viên' });
  }
  next();
};
const requireTeacher = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.teacherId) {
    return res.status(403).json({ error: 'Tài khoản không gắn hồ sơ giáo viên' });
  }
  next();
};

// GET /api/portal/me — context tài khoản portal
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const student = user.studentId
    ? await prisma.student.findUnique({
        where: { id: user.studentId },
        select: { id: true, code: true, name: true, status: true },
      })
    : null;
  const teacher = user.teacherId
    ? await prisma.teacher.findUnique({
        where: { id: user.teacherId },
        select: { id: true, code: true, name: true, employmentStatus: true },
      })
    : null;
  res.json({ user, student, teacher });
});

// ==================== STUDENT PORTAL ====================

// GET /api/portal/student/classes — lớp đang học + link tài liệu/video
router.get('/student/classes', requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  const sid = req.user!.studentId!;
  const members = await prisma.classMember.findMany({
    where: { studentId: sid, status: 'active' },
    include: {
      class: {
        include: {
          course: { select: { code: true, name: true } },
          mainTeacher: { select: { name: true } },
          supportTeacher: { select: { name: true } },
        },
      },
    },
  });
  res.json({
    data: members.map(m => ({
      id: m.class.id,
      code: m.class.code,
      name: m.class.name,
      status: m.class.status,
      classType: m.class.classType,
      shift: m.class.shift,
      schedule: m.class.schedule,
      startDate: m.class.startDate,
      endDate: m.class.endDate,
      course: m.class.course,
      mainTeacher: m.class.mainTeacher?.name,
      supportTeacher: m.class.supportTeacher?.name,
      driveLink: m.class.driveLink,
      videoLink: m.class.videoLink,
      meetingLink: null,
    })),
  });
});

// GET /api/portal/student/schedule — buổi học sắp tới + lịch sử, kèm điểm danh của mình
router.get('/student/schedule', requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  const sid = req.user!.studentId!;
  const members = await prisma.classMember.findMany({
    where: { studentId: sid, status: 'active' },
    select: { classId: true },
  });
  const classIds = members.map(m => m.classId);
  if (classIds.length === 0) return res.json({ data: [] });

  const sessions = await prisma.session.findMany({
    where: { classId: { in: classIds } },
    include: {
      class: { select: { code: true, classType: true, videoLink: true } },
      attendances: {
        where: { studentId: sid },
        select: { status: true, countsAsAttended: true, makeupDirection: true, notes: true },
      },
    },
    orderBy: { date: 'desc' },
    take: 100,
  });
  res.json({
    data: sessions.map(s => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      classCode: s.class.code,
      classType: s.class.classType,
      videoLink: s.class.videoLink,
      meetingLink: s.meetingLink,
      actualContent: s.actualContent,
      homework: s.homework,
      attendance: s.attendances[0] || null,
    })),
  });
});

// GET /api/portal/student/assessments — điểm số
router.get('/student/assessments', requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  const data = await prisma.assessment.findMany({
    where: { studentId: req.user!.studentId! },
    orderBy: { date: 'desc' },
  });
  res.json({ data });
});

// GET /api/portal/student/payments — phiếu thu đã xác nhận của mình
router.get('/student/payments', requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  const receivables = await prisma.receivable.findMany({
    where: { studentId: req.user!.studentId!, status: { not: 'cancelled' } },
    include: {
      course: { select: { code: true, name: true } },
      payments: {
        where: { status: 'confirmed' },
        select: { id: true, code: true, receiptNo: true, amount: true, itemType: true, paymentDate: true, method: true },
        orderBy: { paymentDate: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    data: receivables.map(r => ({
      id: r.id,
      periodLabel: r.periodLabel,
      periodType: r.periodType,
      totalAmount: r.totalAmount,
      status: r.status,
      dueDate: r.dueDate,
      course: r.course,
      payments: r.payments,
    })),
  });
});

// GET /api/portal/student/attendance — lịch sử điểm danh
router.get('/student/attendance', requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  const data = await prisma.attendance.findMany({
    where: { studentId: req.user!.studentId! },
    include: {
      session: {
        select: { date: true, startTime: true, endTime: true, class: { select: { code: true } } },
      },
    },
    orderBy: { session: { date: 'desc' } },
    take: 100,
  });
  res.json({ data });
});

// GET /api/portal/student/receipts/:paymentId — phiếu thu PDF của chính mình
router.get('/student/receipts/:paymentId', requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.paymentId },
    select: { status: true, receivable: { select: { studentId: true } } },
  });
  if (!payment || payment.receivable.studentId !== req.user!.studentId || payment.status !== 'confirmed') {
    return res.status(404).json({ error: 'Payment not found' });
  }
  const ok = await streamReceiptPdf(req.params.paymentId, res);
  if (!ok) res.status(404).json({ error: 'Payment not found' });
});

// ==================== TEACHER PORTAL ====================

// helper: check GV phụ trách lớp (chính hoặc phụ)
async function teacherOwnsClass(teacherId: string, classId: string) {
  const cls = await prisma.class.findFirst({
    where: { id: classId, OR: [{ mainTeacherId: teacherId }, { supportTeacherId: teacherId }] },
    select: { id: true },
  });
  return !!cls;
}

// GET /api/portal/teacher/classes — lớp mình phụ trách
router.get('/teacher/classes', requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const tid = req.user!.teacherId!;
  const classes = await prisma.class.findMany({
    where: { OR: [{ mainTeacherId: tid }, { supportTeacherId: tid }] },
    include: {
      course: { select: { code: true, name: true } },
      _count: { select: { classMembers: { where: { status: 'active' } }, sessions: true } },
    },
    orderBy: { startDate: 'desc' },
  });
  res.json({
    data: classes.map(c => ({
      id: c.id, code: c.code, name: c.name, status: c.status,
      classType: c.classType, shift: c.shift, schedule: c.schedule,
      startDate: c.startDate, endDate: c.endDate,
      driveLink: c.driveLink, videoLink: c.videoLink,
      course: c.course,
      role: c.mainTeacherId === tid ? 'main' : 'support',
      activeStudents: c._count.classMembers,
      totalSessions: c._count.sessions,
    })),
  });
});

// GET /api/portal/teacher/classes/:id — chi tiết lớp + HV + buổi học
router.get('/teacher/classes/:id', requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const tid = req.user!.teacherId!;
  if (!(await teacherOwnsClass(tid, req.params.id))) {
    return res.status(403).json({ error: 'Bạn không phụ trách lớp này' });
  }
  const cls = await prisma.class.findUnique({
    where: { id: req.params.id },
    include: {
      course: { select: { code: true, name: true } },
      classMembers: {
        where: { status: 'active' },
        include: { student: { select: { id: true, code: true, name: true, phone: true } } },
      },
    },
  });
  res.json(cls);
});

// GET /api/portal/teacher/classes/:id/sessions — buổi học của lớp mình + điểm danh
router.get('/teacher/classes/:id/sessions', requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const tid = req.user!.teacherId!;
  if (!(await teacherOwnsClass(tid, req.params.id))) {
    return res.status(403).json({ error: 'Bạn không phụ trách lớp này' });
  }
  const sessions = await prisma.session.findMany({
    where: { classId: req.params.id },
    include: {
      attendances: {
        include: { student: { select: { id: true, code: true, name: true } } },
      },
    },
    orderBy: { date: 'desc' },
  });
  res.json({ data: sessions });
});

// PUT /api/portal/teacher/sessions/:id — GV cập nhật buổi của lớp mình (trạng thái, giờ dạy, nội dung)
router.put('/teacher/sessions/:id', requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const tid = req.user!.teacherId!;
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: { class: { select: { mainTeacherId: true, supportTeacherId: true } } },
  });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.class.mainTeacherId !== tid && session.class.supportTeacherId !== tid) {
    return res.status(403).json({ error: 'Bạn không phụ trách lớp này' });
  }

  const { status, calculatedHours, actualContent, homework, notes } = req.body;
  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      ...(status ? { status } : {}),
      ...(calculatedHours !== undefined ? { calculatedHours } : {}),
      ...(actualContent !== undefined ? { actualContent } : {}),
      ...(homework !== undefined ? { homework } : {}),
      ...(notes !== undefined ? { notes } : {}),
      // GV thực dạy = người nhập (dạy thay cũng ghi nhận đúng người)
      teacherId: tid,
    },
  });
  res.json(updated);
});

// POST /api/portal/teacher/sessions/:id/attendance — điểm danh lớp mình (dùng chung rules)
router.post('/teacher/sessions/:id/attendance', requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const tid = req.user!.teacherId!;
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: { class: { select: { mainTeacherId: true, supportTeacherId: true } } },
  });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.class.mainTeacherId !== tid && session.class.supportTeacherId !== tid) {
    return res.status(403).json({ error: 'Bạn không phụ trách lớp này' });
  }
  const { attendances } = req.body;
  if (!Array.isArray(attendances)) {
    return res.status(400).json({ error: 'attendances array required' });
  }
  const result = await saveAttendanceForSession(session.id, attendances, req.user!.id);
  if ('error' in result) {
    return res.status(result.statusCode).json({ error: result.error });
  }
  // điểm danh xong mặc định buổi → taught nếu còn planned
  if (session.status === 'planned') {
    await prisma.session.update({ where: { id: session.id }, data: { status: 'taught', teacherId: tid } });
  }
  res.json(result);
});

// POST /api/portal/teacher/assessments — GV nhập điểm cho HV trong lớp mình
router.post('/teacher/assessments', requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const tid = req.user!.teacherId!;
  const { studentId, classId, type, date, score, maxScore, jlptResult, grade, notes } = req.body;
  if (!studentId || !type) {
    return res.status(400).json({ error: 'studentId, type required' });
  }
  // HV phải đang trong lớp của GV
  const membership = await prisma.classMember.findFirst({
    where: {
      studentId,
      status: 'active',
      class: { OR: [{ mainTeacherId: tid }, { supportTeacherId: tid }] },
      ...(classId ? { classId } : {}),
    },
    include: { class: { select: { id: true } } },
  });
  if (!membership) {
    return res.status(403).json({ error: 'Học viên không thuộc lớp bạn phụ trách' });
  }

  const passThreshold = await getNum('assessment_pass_threshold', 60);
  const percent = score !== undefined && maxScore ? (score / maxScore) * 100 : undefined;
  const passed = jlptResult
    ? jlptResult.toLowerCase().includes('đậu') || jlptResult.toLowerCase().includes('dau')
    : percent !== undefined ? percent >= passThreshold : undefined;

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, classId: membership.class.id },
    select: { id: true },
  });

  const a = await prisma.assessment.create({
    data: {
      studentId,
      enrollmentId: enrollment?.id || null,
      type,
      date: date ? new Date(date) : new Date(),
      score: score !== undefined ? Number(score) : null,
      maxScore: maxScore !== undefined ? Number(maxScore) : null,
      percent: percent ?? null,
      passed: passed ?? null,
      jlptResult: jlptResult || null,
      grade: grade || null,
      notes: notes || null,
      createdBy: req.user!.id,
    },
  });
  res.status(201).json(a);
});

// GET /api/portal/teacher/payroll — kỳ lương của mình (read-only)
router.get('/teacher/payroll', requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
  const data = await prisma.teacherPayrollPeriod.findMany({
    where: { teacherId: req.user!.teacherId! },
    include: { items: { orderBy: { date: 'asc' } } },
    orderBy: { periodStart: 'desc' },
  });
  res.json({ data });
});

export default router;
