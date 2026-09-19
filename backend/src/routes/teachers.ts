import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

const teacherSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  education: z.string().optional(),
  certificates: z.string().optional(),
  cooperationType: z.string(),
  maxHoursPerWeek: z.number().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/teachers
router.get('/', requirePermission('teachers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const includeInactive = req.query.all === 'true';
    const where: any = includeInactive ? {} : { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const teachers = await prisma.teacher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { classesMain: true, sessions: true },
        },
      },
    });

    res.json({ data: teachers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// GET /api/teachers/:id
router.get('/:id', requirePermission('teachers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        availability: { where: { isActive: true } },
        rates: { orderBy: { effectiveFrom: 'desc' } },
        classesMain: {
          include: { course: { select: { name: true, level: true } } },
        },
        sessions: {
          orderBy: { date: 'desc' },
          take: 20,
          include: { class: { select: { code: true } } },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teacher' });
  }
});

// POST /api/teachers
router.post('/', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = teacherSchema.parse(req.body);

    const count = await prisma.teacher.count();
    const code = `T${String(count + 1).padStart(4, '0')}`;

    const teacher = await prisma.teacher.create({
      data: { ...data, code },
    });

    res.status(201).json(teacher);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// PUT /api/teachers/:id
router.put('/:id', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = teacherSchema.partial().parse(req.body);

    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const updated = await prisma.teacher.update({ where: { id }, data });
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update teacher' });
  }
});

// POST /api/teachers/:id/availability - Add availability slot
router.post('/:id/availability', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { dayOfWeek, startTime, endTime } = req.body;

    const slot = await prisma.teacherAvailability.create({
      data: { teacherId: id, dayOfWeek, startTime, endTime },
    });

    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add availability' });
  }
});

// POST /api/teachers/:id/rates - Add rate
router.post('/:id/rates', requirePermission('teachers', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { classType, role, rate, effectiveFrom } = req.body;

    const newRate = await prisma.teacherRate.create({
      data: {
        teacherId: id,
        classType,
        role,
        rate,
        effectiveFrom: new Date(effectiveFrom),
        approvedBy: req.user?.id,
      },
    });

    res.status(201).json(newRate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add rate' });
  }
});

export default router;
