import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// GET /api/warnings - Academic warnings list
router.get('/', requirePermission('students', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const warnings = await prisma.academicWarning.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, code: true, name: true, phone: true } },
      },
    });

    res.json({ data: warnings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch warnings' });
  }
});

// POST /api/warnings - Create warning manually
router.post('/', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, type, details } = req.body;

    if (!studentId || !type) {
      return res.status(400).json({ error: 'studentId and type required' });
    }

    const warning = await prisma.academicWarning.create({
      data: {
        studentId,
        type,
        details,
        status: 'new',
      },
      include: {
        student: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json(warning);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create warning' });
  }
});

// PATCH /api/warnings/:id - Update warning status
router.patch('/:id', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, details } = req.body;

    const warning = await prisma.academicWarning.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(details && { details }),
        ...(status === 'resolved' && { resolvedAt: new Date(), resolvedBy: req.user?.id }),
      },
      include: {
        student: { select: { id: true, code: true, name: true } },
      },
    });

    res.json(warning);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update warning' });
  }
});

export default router;
