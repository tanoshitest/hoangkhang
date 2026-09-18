import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

const classSchema = z.object({
  courseId: z.string(),
  format: z.string().default('online'),
  startDate: z.string(),
  endDate: z.string(),
  maxStudents: z.number().optional(),
  mainTeacherId: z.string().optional(),
  supportTeacherId: z.string().optional(),
  schedule: z.string().optional(),
  meetingLink: z.string().optional(),
  content: z.string().optional(),
  status: z.string().optional(),
});

// GET /api/classes
router.get('/', requirePermission('classes', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const courseId = req.query.courseId as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (courseId) where.courseId = courseId;
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { course: { name: { contains: search } } },
      ];
    }

    const classes = await prisma.class.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        course: { select: { id: true, code: true, name: true, level: true } },
        mainTeacher: { select: { id: true, name: true } },
        supportTeacher: { select: { id: true, name: true } },
        _count: { select: { classMembers: true, sessions: true } },
      },
    });

    res.json({ data: classes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/classes/:id
router.get('/:id', requirePermission('classes', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        course: true,
        mainTeacher: { select: { id: true, name: true, phone: true } },
        supportTeacher: { select: { id: true, name: true, phone: true } },
        classMembers: {
          include: {
            student: { select: { id: true, code: true, name: true, phone: true, status: true } },
          },
          orderBy: { joinedAt: 'desc' },
        },
        sessions: {
          include: {
            teacher: { select: { id: true, name: true } },
            _count: { select: { attendances: true } },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json(classData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// POST /api/classes
router.post('/', requirePermission('classes', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = classSchema.parse(req.body);

    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Teacher conflict check: same teacher can't have 2 overlapping sessions is checked at session level,
    // but we can warn if teacher is already main teacher of another class in same date range
    if (data.mainTeacherId) {
      const overlapping = await prisma.class.findFirst({
        where: {
          mainTeacherId: data.mainTeacherId,
          status: { in: ['planned', 'recruiting', 'full', 'studying'] },
          AND: [
            { startDate: { lte: new Date(data.endDate) } },
            { endDate: { gte: new Date(data.startDate) } },
          ],
        },
        select: { code: true },
      });
      if (overlapping) {
        return res.status(409).json({
          error: 'Teacher schedule conflict',
          detail: `Giáo viên đã phụ trách lớp ${overlapping.code} trong khoảng thời gian này`,
          conflictingClass: overlapping.code,
        });
      }
    }

    const count = await prisma.class.count({ where: { courseId: data.courseId } });
    const code = `${course.code}-${String(count + 1).padStart(2, '0')}`;

    const newClass = await prisma.class.create({
      data: {
        ...data,
        code,
        status: data.status || 'planned',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
        mainTeacher: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(newClass);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// PUT /api/classes/:id
router.put('/:id', requirePermission('classes', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = classSchema.partial().parse(req.body);

    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        ...data,
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
        mainTeacher: { select: { id: true, name: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// POST /api/classes/:id/members - Add student to class
router.post('/:id/members', requirePermission('classes', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    const classData = await prisma.class.findUnique({
      where: { id },
      include: { _count: { select: { classMembers: { where: { status: 'active' } } } } },
    });
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (classData.maxStudents && classData._count.classMembers >= classData.maxStudents) {
      return res.status(400).json({ error: 'Class is full' });
    }

    const existing = await prisma.classMember.findFirst({
      where: { classId: id, studentId, status: 'active' },
    });
    if (existing) {
      return res.status(400).json({ error: 'Student already in class' });
    }

    const member = await prisma.classMember.create({
      data: { classId: id, studentId, status: 'active' },
      include: {
        student: { select: { id: true, code: true, name: true } },
      },
    });

    await prisma.class.update({
      where: { id },
      data: { currentStudents: { increment: 1 } },
    });

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add student to class' });
  }
});

// DELETE /api/classes/:id/members/:memberId - Remove student from class
router.delete('/:id/members/:memberId', requirePermission('classes', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId } = req.params;

    const member = await prisma.classMember.update({
      where: { id: memberId },
      data: { status: 'dropped', leftAt: new Date() },
    });

    await prisma.class.update({
      where: { id: member.classId },
      data: { currentStudents: { decrement: 1 } },
    });

    res.json(member);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove student from class' });
  }
});

export default router;
