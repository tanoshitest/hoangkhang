import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
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

// POST /api/sessions/:id/attendance - Bulk save attendance for a session
router.post('/:id/attendance', requirePermission('attendance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { attendances } = req.body; // [{ studentId, status, notes }]

    if (!Array.isArray(attendances)) {
      return res.status(400).json({ error: 'attendances array required' });
    }

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Upsert each attendance
    const results = await Promise.all(
      attendances.map(async (a: { studentId: string; status: string; notes?: string }) => {
        const existing = await prisma.attendance.findFirst({
          where: { sessionId: id, studentId: a.studentId },
        });
        if (existing) {
          return prisma.attendance.update({
            where: { id: existing.id },
            data: { status: a.status, notes: a.notes || null },
          });
        }
        return prisma.attendance.create({
          data: {
            sessionId: id,
            studentId: a.studentId,
            status: a.status,
            notes: a.notes || null,
            createdBy: req.user?.id || 'system',
          },
        });
      })
    );

    res.json({ saved: results.length, attendances: results });
  } catch (error) {
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
