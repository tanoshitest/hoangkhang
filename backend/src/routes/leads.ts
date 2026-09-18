import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  birthYear: z.number().optional(),
  zalo: z.string().optional(),
  province: z.string().optional(),
  educationLevel: z.string().optional(),
  goal: z.string().optional(),
  japanProgram: z.string().optional(),
  availableTime: z.string().optional(),
  source: z.string(),
  interestedCourse: z.string().optional(),
  expectedClass: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/leads - Get all leads with pagination
router.get('/', requirePermission('leads', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Sales chỉ xem lead được phân công cho mình
    if (req.user?.roles.includes('sales') && !req.user.roles.includes('admin')) {
      where.assignedToId = req.user.id;
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      data: leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id - Get lead by ID
router.get('/:id', requirePermission('leads', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        followUps: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        trialTests: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (req.user?.roles.includes('sales') && !req.user.roles.includes('admin')) {
      if (lead.assignedToId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST /api/leads - Create new lead
router.post('/', requirePermission('leads', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = leadSchema.parse(req.body);

    // Check duplicate phone/email
    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: data.phone },
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
    });

    if (existingLead) {
      return res.status(400).json({
        error: 'Lead with this phone/email already exists',
        existingLeadId: existingLead.id,
        existingLeadName: existingLead.name,
      });
    }

    const count = await prisma.lead.count();
    const code = `L${String(count + 1).padStart(6, '0')}`;

    const lead = await prisma.lead.create({
      data: {
        ...data,
        code,
        status: 'new',
        assignedToId: req.user?.id,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json(lead);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', requirePermission('leads', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = leadSchema.partial().parse(req.body);

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (req.user?.roles.includes('sales') && !req.user.roles.includes('admin')) {
      if (lead.assignedToId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(updatedLead);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// PATCH /api/leads/:id/status - Update lead status (for Kanban drag-drop)
router.patch('/:id/status', requirePermission('leads', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (req.user?.roles.includes('sales') && !req.user.roles.includes('admin')) {
      if (lead.assignedToId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { status },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(updatedLead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

// POST /api/leads/:id/activities - Log an activity (call, message, email, meeting)
router.post('/:id/activities', requirePermission('leads', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, content } = req.body;

    if (!type || !content) {
      return res.status(400).json({ error: 'type and content are required' });
    }

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: id,
        type,
        content,
        createdBy: req.user?.id || 'system',
      },
    });

    await prisma.lead.update({
      where: { id },
      data: { lastContactDate: new Date() },
    });

    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// POST /api/leads/:id/followups - Schedule a follow-up
router.post('/:id/followups', requirePermission('leads', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { date, content } = req.body;

    if (!date || !content) {
      return res.status(400).json({ error: 'date and content are required' });
    }

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const followUp = await prisma.leadFollowUp.create({
      data: {
        leadId: id,
        date: new Date(date),
        content,
        status: 'scheduled',
        createdBy: req.user?.id || 'system',
      },
    });

    await prisma.lead.update({
      where: { id },
      data: { nextFollowUpDate: new Date(date) },
    });

    res.status(201).json(followUp);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create follow-up' });
  }
});

// PATCH /api/leads/:id/followups/:followUpId - Update follow-up status
router.patch('/:id/followups/:followUpId', requirePermission('leads', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { followUpId } = req.params;
    const { status, content } = req.body;

    const followUp = await prisma.leadFollowUp.update({
      where: { id: followUpId },
      data: {
        ...(status && { status }),
        ...(content && { content }),
      },
    });

    res.json(followUp);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update follow-up' });
  }
});

// POST /api/leads/:id/trials - Record a placement test / trial class
router.post('/:id/trials', requirePermission('leads', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, date, result, notes } = req.body;

    if (!type || !date) {
      return res.status(400).json({ error: 'type and date are required' });
    }

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const trial = await prisma.trialTest.create({
      data: {
        leadId: id,
        type,
        date: new Date(date),
        result: result || null,
        notes: notes || null,
        createdBy: req.user?.id || 'system',
      },
    });

    res.status(201).json(trial);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create trial/test record' });
  }
});

// POST /api/leads/:id/convert - Convert lead to student
router.post('/:id/convert', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (lead.convertedToStudentId) {
      return res.status(400).json({ error: 'Lead already converted' });
    }

    if (req.user?.roles.includes('sales') && !req.user.roles.includes('admin')) {
      if (lead.assignedToId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const count = await prisma.student.count();
    const code = `S${String(count + 1).padStart(6, '0')}`;

    const student = await prisma.student.create({
      data: {
        code,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        educationLevel: lead.educationLevel,
        goal: lead.goal,
        status: 'waiting_class',
        convertedFromLeadId: lead.id,
      },
    });

    await prisma.lead.update({
      where: { id },
      data: {
        status: 'registered',
        convertedToStudentId: student.id,
      },
    });

    res.json({
      message: 'Lead converted successfully',
      student,
      lead: {
        id: lead.id,
        status: 'registered',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

export default router;
