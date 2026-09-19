import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import { getNum } from '../lib/settings';
import { auditLog } from './admin';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

const sessionSchema = z.object({
  classId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  teacherId: z.string(),
  meetingLink: z.string().optional(),
  plannedContent: z.string().optional(),
});

const sessionUpdateSchema = z.object({
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  teacherId: z.string().optional(),
  meetingLink: z.string().optional(),
  plannedContent: z.string().optional(),
  actualContent: z.string().optional(),
  homework: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

// Helper: check teacher double-booking (overlapping sessions same day)
async function checkTeacherConflict(
  teacherId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeSessionId?: string
) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const sessions = await prisma.session.findMany({
    where: {
      teacherId,
      date: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['cancelled', 'rescheduled'] },
      ...(excludeSessionId && { id: { not: excludeSessionId } }),
    },
    include: {
      class: { select: { code: true } },
    },
  });

  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const newStart = toMin(startTime);
  const newEnd = toMin(endTime);

  return sessions.find(s => {
    const sStart = toMin(s.startTime);
    const sEnd = toMin(s.endTime);
    return newStart < sEnd && newEnd > sStart;
  });
}

// GET /api/sessions
router.get('/', requirePermission('sessions', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const classId = req.query.classId as string | undefined;
    const teacherId = req.query.teacherId as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (classId) where.classId = classId;
    if (teacherId) where.teacherId = teacherId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const sessions = await prisma.session.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        class: { select: { id: true, code: true, course: { select: { name: true } } } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { attendances: true } },
      },
    });

    res.json({ data: sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/sessions/:id
router.get('/:id', requirePermission('sessions', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            course: true,
            classMembers: {
              where: { status: 'active' },
              include: {
                student: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
        teacher: { select: { id: true, name: true, phone: true } },
        attendances: {
          include: {
            student: { select: { id: true, code: true, name: true } },
          },
        },
        progress: true,
        changes: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/sessions - Create session with teacher conflict check
router.post('/', requirePermission('sessions', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = sessionSchema.parse(req.body);

    const classData = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const conflict = await checkTeacherConflict(data.teacherId, new Date(data.date), data.startTime, data.endTime);
    if (conflict) {
      return res.status(409).json({
        error: 'Teacher schedule conflict',
        detail: `Giáo viên đã có session lớp ${conflict.class.code} từ ${conflict.startTime} đến ${conflict.endTime} trong ngày này`,
        conflictingSession: {
          id: conflict.id,
          classCode: conflict.class.code,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
        },
      });
    }

    const session = await prisma.session.create({
      data: {
        ...data,
        date: new Date(data.date),
        status: 'planned',
      },
      include: {
        class: { select: { id: true, code: true } },
        teacher: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// PUT /api/sessions/:id - Update session (with conflict check on reschedule)
router.put('/:id', requirePermission('sessions', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = sessionUpdateSchema.parse(req.body);

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const newDate = data.date ? new Date(data.date) : existing.date;
    const newStart = data.startTime || existing.startTime;
    const newEnd = data.endTime || existing.endTime;
    const newTeacher = data.teacherId || existing.teacherId;

    if (data.date || data.startTime || data.endTime || data.teacherId) {
      const conflict = await checkTeacherConflict(newTeacher, newDate, newStart, newEnd, id);
      if (conflict) {
        return res.status(409).json({
          error: 'Teacher schedule conflict',
          detail: `Giáo viên đã có session lớp ${conflict.class.code} từ ${conflict.startTime} đến ${conflict.endTime}`,
        });
      }
    }

    const session = await prisma.session.update({
      where: { id },
      data: {
        ...data,
        ...(data.date && { date: new Date(data.date) }),
      },
      include: {
        class: { select: { id: true, code: true } },
        teacher: { select: { id: true, name: true } },
      },
    });

    res.json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// POST /api/sessions/:id/attendance - Bulk save attendance with nghiệp vụ rules
// Rules (THAM_SO): báo nghỉ ≥24h + ≤2 lần/tháng = có phép (không tính buổi);
// báo <24h / quá 2 lần / không báo = vẫn tính 1 buổi. Vắng cộng dồn ≥2 → cảnh báo.
// Logic điểm danh dùng chung cho staff route + portal GV (scoped check ở caller)
export interface AttendanceInput {
  studentId: string;
  status: string;
  notes?: string;
  reportedBeforeHours?: number;
  makeupDirection?: string;
}

export type SaveAttendanceResult =
  | { error: string; statusCode: number }
  | { saved: number; attendances: any[]; warningsCreated: number };

export async function saveAttendanceForSession(id: string, attendances: AttendanceInput[], userId: string): Promise<SaveAttendanceResult> {
  const session = await prisma.session.findUnique({
    where: { id },
    include: { class: { select: { classType: true, code: true } } },
  });
  if (!session) {
    return { error: 'Session not found', statusCode: 404 };
  }

  const noticeHours = await getNum('absence_notice_hours', 24);
  const maxExcused = await getNum('excused_absence_per_month', 2);
  const warnAfter = await getNum('absence_warning_count', 2);
  const isGroup = session.class?.classType !== 'one_on_one';

  const monthStart = new Date(session.date.getFullYear(), session.date.getMonth(), 1);
  const monthEnd = new Date(session.date.getFullYear(), session.date.getMonth() + 1, 1);

  const results = [];
  for (const a of attendances) {
    const isAbsent = a.status === 'excused_absent' || a.status === 'unexcused_absent';
    let reportedBeforeHours: number | null = null;
    let excusedCountInMonth: number | null = null;
    let countsAsAttended = a.status === 'present' || a.status === 'late' || a.status === 'early_leave';
    let makeupDirection: string | null = null;

    if (isAbsent) {
      reportedBeforeHours = a.reportedBeforeHours ?? null;
      // Đếm số lần nghỉ phép trong tháng dương lịch của buổi này
      const excusedCount = await prisma.attendance.count({
        where: {
          studentId: a.studentId,
          status: 'excused_absent',
          session: { date: { gte: monthStart, lt: monthEnd }, id: { not: id } },
        },
      });
      excusedCountInMonth = excusedCount + 1;

      const reportedEnough = reportedBeforeHours !== null && reportedBeforeHours >= noticeHours;
      if (a.status === 'excused_absent' && reportedEnough && excusedCountInMonth <= maxExcused) {
        countsAsAttended = false; // nghỉ có phép hợp lệ → không tính buổi
      } else {
        countsAsAttended = true; // báo <24h / quá 2 lần / không phép → vẫn tính 1 buổi
      }
      makeupDirection = a.makeupDirection ||
        (isGroup ? 'watch_video' : 'private_session');
    }

    const data = {
      status: a.status,
      notes: a.notes || null,
      reportedBeforeHours,
      excusedCountInMonth,
      countsAsAttended,
      makeupDirection,
    };

    const existing = await prisma.attendance.findFirst({
      where: { sessionId: id, studentId: a.studentId },
    });
    const record = existing
      ? await prisma.attendance.update({ where: { id: existing.id }, data })
      : await prisma.attendance.create({
          data: { ...data, sessionId: id, studentId: a.studentId, createdBy: userId },
        });
    results.push(record);
  }

  // Cảnh báo vắng cộng dồn: HV có ≥N buổi vắng (kể cả có phép) trong lớp này
  const warned: string[] = [];
  for (const a of attendances) {
    if (a.status !== 'excused_absent' && a.status !== 'unexcused_absent') continue;
    const totalAbsent = await prisma.attendance.count({
      where: {
        studentId: a.studentId,
        status: { in: ['excused_absent', 'unexcused_absent'] },
        session: { classId: session.classId },
      },
    });
    if (totalAbsent >= warnAfter) {
      const existingWarning = await prisma.academicWarning.findFirst({
        where: {
          studentId: a.studentId,
          type: 'consecutive_absent',
          status: { in: ['new', 'processing', 'contacted'] },
        },
      });
      if (!existingWarning) {
        await prisma.academicWarning.create({
          data: {
            studentId: a.studentId,
            type: 'consecutive_absent',
            status: 'new',
            details: `Vắng ${totalAbsent} buổi cộng dồn ở lớp ${session.class?.code || ''} (ngưỡng cảnh báo: ${warnAfter})`,
          },
        });
        warned.push(a.studentId);
      }
    }
  }

  await auditLog(userId, 'attendance_save', 'Session', id, undefined, {
    classCode: session.class?.code,
    records: results.length,
    absents: results.filter(r => ['excused_absent', 'unexcused_absent'].includes(r.status)).length,
    warningsCreated: warned.length,
  });

  return { saved: results.length, attendances: results, warningsCreated: warned.length };
}

router.post('/:id/attendance', requirePermission('attendance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { attendances } = req.body;
    if (!Array.isArray(attendances)) {
      return res.status(400).json({ error: 'attendances array required' });
    }
    const result = await saveAttendanceForSession(req.params.id, attendances, req.user!.id);
    if ('error' in result) {
      return res.status(result.statusCode).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save attendance' });
  }
});

// POST /api/sessions/:id/progress - Save learning progress per student
router.post('/:id/progress', requirePermission('sessions', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId, content, actualContent, homework, completionRate, testScore, teacherComment, skillsToImprove } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId required' });
    }

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const existing = await prisma.learningProgress.findFirst({
      where: { sessionId: id, studentId },
    });

    let progress;
    if (existing) {
      progress = await prisma.learningProgress.update({
        where: { id: existing.id },
        data: { content, actualContent, homework, completionRate, testScore, teacherComment, skillsToImprove },
      });
    } else {
      progress = await prisma.learningProgress.create({
        data: {
          sessionId: id,
          studentId,
          content, actualContent, homework, completionRate, testScore, teacherComment, skillsToImprove,
          createdBy: req.user?.id || 'system',
        },
      });
    }

    res.status(201).json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

export default router;
