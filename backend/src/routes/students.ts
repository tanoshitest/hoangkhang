import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

const studentSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  educationLevel: z.string().optional(),
  goal: z.string().optional(),
  workSchedule: z.string().optional(),
  supportNeeds: z.string().optional(),
  notes: z.string().optional(),
  referredBy: z.string().optional(),
});

// GET /api/students - Get all students
router.get('/', requirePermission('students', 'read'), async (req: AuthenticatedRequest, res: Response) => {
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
        { code: { contains: search } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contacts: true,
          enrollments: {
            include: {
              course: true,
              class: true,
              events: {
                orderBy: { effectiveDate: 'desc' },
                take: 5,
              },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    res.json({
      data: students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', requirePermission('students', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        contacts: true,
        enrollments: {
          include: {
            course: true,
            class: true,
            events: true,
          },
        },
        attendances: {
          include: {
            session: {
              include: {
                class: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        receivables: {
          include: {
            course: true,
            payments: true,
          },
        },
        warnings: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// POST /api/students - Create new student
router.post('/', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = studentSchema.parse(req.body);

    // Check duplicate phone/email
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { phone: data.phone },
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
    });

    if (existingStudent) {
      return res.status(400).json({
        error: 'Student with this phone/email already exists',
        existingStudentId: existingStudent.id,
        existingStudentName: existingStudent.name,
      });
    }

    const count = await prisma.student.count();
    const code = `S${String(count + 1).padStart(6, '0')}`;

    const student = await prisma.student.create({
      data: {
        ...data,
        code,
        status: 'waiting_class',
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
      },
      include: {
        contacts: true,
      },
    });

    res.status(201).json(student);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = studentSchema.partial().parse(req.body);

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
      include: {
        contacts: true,
      },
    });

    res.json(updatedStudent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// GET /api/students/:id/enrollments - Get student enrollments
router.get('/:id/enrollments', requirePermission('students', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: id },
      include: {
        course: true,
        class: true,
        events: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// POST /api/students/:id/enroll - Enroll student to course
router.post('/:id/enroll', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { courseId, classId } = req.body;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: id,
        courseId,
        classId: classId || null,
        status: 'enrolled',
      },
      include: {
        course: true,
        class: true,
      },
    });

    await prisma.enrollmentEvent.create({
      data: {
        enrollmentId: enrollment.id,
        type: 'enroll',
        effectiveDate: new Date(),
        createdBy: req.user?.id || 'system',
      },
    });

    res.status(201).json(enrollment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to enroll student' });
  }
});

export default router;
