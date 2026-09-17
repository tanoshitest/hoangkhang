const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requirePermission } = require('../middleware/rbac');
const { z } = require('zod');

const router = express.Router();
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
  notes: z.string().optional(),
});

// GET /api/leads - Get all leads with pagination
router.get('/', requirePermission('leads', 'read'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const search = req.query.search;

    const where = {};
    
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
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
router.get('/:id', requirePermission('leads', 'read'), async (req, res) => {
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

    // Sales chỉ xem lead của mình
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
router.post('/', requirePermission('leads', 'write'), async (req, res) => {
  try {
    const data = leadSchema.parse(req.body);
    
    // Check duplicate phone/email
    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: data.phone },
          { email: data.email || undefined },
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

    // Generate lead code
    const count = await prisma.lead.count();
    const code = `L${String(count + 1).padStart(6, '0')}`;

    const lead = await prisma.lead.create({
      data: {
        ...data,
        code,
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
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', requirePermission('leads', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = leadSchema.partial().parse(req.body);

    // Check permission
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
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// POST /api/leads/:id/convert - Convert lead to student
router.post('/:id/convert', requirePermission('students', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (lead.convertedToStudentId) {
      return res.status(400).json({ error: 'Lead already converted' });
    }

    // Check permission
    if (req.user?.roles.includes('sales') && !req.user.roles.includes('admin')) {
      if (lead.assignedToId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Generate student code
    const count = await prisma.student.count();
    const code = `S${String(count + 1).padStart(6, '0')}`;

    // Create student from lead
    const student = await prisma.student.create({
      data: {
        code,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        educationLevel: lead.educationLevel,
        goal: lead.goal,
        convertedFromLeadId: lead.id,
      },
    });

    // Update lead status
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

module.exports = router;
