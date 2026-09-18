import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

const courseSchema = z.object({
  name: z.string().min(2),
  level: z.string(),
  textbook: z.string().optional(),
  goal: z.string().optional(),
  totalSessions: z.number().optional(),
  totalHours: z.number().optional(),
  standardFee: z.number().optional(),
  content: z.string().optional(),
  testSchedule: z.string().optional(),
  completionStandard: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/courses
router.get('/', requirePermission('courses', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const level = req.query.level as string | undefined;
    const includeInactive = req.query.includeInactive === 'true';

    const where: any = {};
    if (level) where.level = level;
    if (!includeInactive) where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { classes: true, enrollments: true },
        },
      },
    });

    res.json({ data: courses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET /api/courses/:id
router.get('/:id', requirePermission('courses', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        classes: {
          include: {
            mainTeacher: { select: { id: true, name: true } },
            _count: { select: { classMembers: true, sessions: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// POST /api/courses
router.post('/', requirePermission('courses', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = courseSchema.parse(req.body);

    const count = await prisma.course.count();
    const code = `${data.level.toUpperCase()}${String(count + 1).padStart(3, '0')}`;

    const course = await prisma.course.create({
      data: { ...data, code },
    });

    res.status(201).json(course);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// PUT /api/courses/:id
router.put('/:id', requirePermission('courses', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = courseSchema.partial().parse(req.body);

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const updated = await prisma.course.update({ where: { id }, data });
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update course' });
  }
});

export default router;
