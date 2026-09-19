import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { requireRole, requirePermission } from '../middleware/rbac';
import type { AuthenticatedRequest } from '../types';
import { clearSettingsCache } from '../lib/settings';

const router = Router();
const prisma = new PrismaClient();

// Audit log helper — ghi lại mutations quan trọng
export async function auditLog(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  oldValue?: any,
  newValue?: any,
  reason?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId, action, entity, entityId,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
        reason,
      },
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

// ==================== USER MANAGEMENT ====================

// GET /api/admin/users - List users with roles
router.get('/users', requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, phone: true, isActive: true,
        createdAt: true,
        roles: { include: { role: { select: { name: true, displayName: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({
      data: users.map(u => ({
        ...u,
        roles: u.roles.map(r => r.role.name),
        roleNames: u.roles.map(r => r.role.displayName),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users - Create user
router.post('/users', requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, name, phone, password, roles } = req.body;
    if (!email || !name || !password || !roles?.length) {
      return res.status(400).json({ error: 'email, name, password, roles required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email, name, phone, password: hashedPassword,
        roles: {
          create: roles.map((roleName: string) => ({
            role: { connect: { name: roleName } },
          })),
        },
      },
      include: { roles: { include: { role: true } } },
    });

    await auditLog(req.user!.id, 'create', 'user', user.id, null, { email, name, roles });
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/admin/users/:id - Update user (name, phone, active, roles, reset password)
router.patch('/users/:id', requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, isActive, roles, password } = req.body;
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { roles: { include: { role: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.password = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({ where: { id: req.params.id }, data });

    if (roles) {
      await prisma.userRole.deleteMany({ where: { userId: req.params.id } });
      for (const roleName of roles) {
        const role = await prisma.role.findUnique({ where: { name: roleName } });
        if (role) {
          await prisma.userRole.create({ data: { userId: req.params.id, roleId: role.id } });
        }
      }
    }

    await auditLog(req.user!.id, 'update', 'user', req.params.id,
      { name: existing.name, isActive: existing.isActive },
      { name, isActive, rolesChanged: !!roles, passwordReset: !!password });
    res.json({ id: updated.id, email: updated.email, name: updated.name, isActive: updated.isActive });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// GET /api/admin/roles - Roles with permission matrix
router.get('/roles', requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({
      data: roles.map(r => ({
        id: r.id, name: r.name, displayName: r.displayName,
        description: r.description,
        userCount: r._count.users,
        permissions: r.permissions.map(p => `${p.permission.module}:${p.permission.action}`),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// ==================== STATUS CONFIG ====================

// GET /api/admin/statuses?module=
router.get('/statuses', requireRole(['admin', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.module) where.module = req.query.module;
    const statuses = await prisma.statusDefinition.findMany({
      where,
      orderBy: [{ module: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json({ data: statuses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

// POST /api/admin/statuses - Add custom status
router.post('/statuses', requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { module, status, displayName, color, sortOrder } = req.body;
    if (!module || !status || !displayName) {
      return res.status(400).json({ error: 'module, status, displayName required' });
    }
    const existing = await prisma.statusDefinition.findFirst({ where: { module, status } });
    if (existing) return res.status(409).json({ error: 'Status already exists in this module' });

    const created = await prisma.statusDefinition.create({
      data: { module, status, displayName, color, sortOrder: sortOrder || 0, isSystem: false },
    });
    await auditLog(req.user!.id, 'create', 'status', created.id, null, { module, status });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create status' });
  }
});

// PATCH /api/admin/statuses/:id - Update displayName/color/sortOrder/isActive
router.patch('/statuses/:id', requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { displayName, color, sortOrder, isActive } = req.body;
    const status = await prisma.statusDefinition.findUnique({ where: { id: req.params.id } });
    if (!status) return res.status(404).json({ error: 'Status not found' });

    const data: any = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (color !== undefined) data.color = color;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    // Per plan: can hide statuses but not delete ones used in history
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.statusDefinition.update({ where: { id: req.params.id }, data });
    await auditLog(req.user!.id, 'update', 'status', req.params.id, status, data);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ==================== SETTINGS ====================

// GET /api/admin/settings
router.get('/settings', requireRole(['admin', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
    res.json({ data: settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings/:key - Upsert setting
router.put('/settings/:key', requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { value, type, description } = req.body;
    if (value === undefined) return res.status(400).json({ error: 'value required' });

    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      update: { value: String(value), type, description },
      create: { key: req.params.key, value: String(value), type: type || 'string', description },
    });
    clearSettingsCache();
    await auditLog(req.user!.id, 'update', 'setting', setting.id, null, { key: req.params.key, value });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

// ==================== DON_GIA_GV (đơn giá giờ dạy lớp 1-1) ====================

// GET /api/admin/teacher-rates - bảng đơn giá chung (teacherId=null) + override theo GV
router.get('/teacher-rates', requireRole(['admin', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rates = await prisma.teacherRate.findMany({
      where: { effectiveTo: null },
      orderBy: [{ level: 'asc' }, { employmentStatus: 'asc' }],
      include: { teacher: { select: { id: true, code: true, name: true } } },
    });
    res.json({ data: rates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teacher rates' });
  }
});

// PUT /api/admin/teacher-rates - cập nhật đơn giá chung theo level × trạng thái
router.put('/teacher-rates', requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { level, employmentStatus, rate } = req.body;
    if (!level || !employmentStatus || rate === undefined) {
      return res.status(400).json({ error: 'level, employmentStatus, rate required' });
    }
    if (rate < 0) return res.status(400).json({ error: 'rate must be >= 0' });

    const existing = await prisma.teacherRate.findFirst({
      where: { teacherId: null, level, employmentStatus, effectiveTo: null },
    });
    let row;
    if (existing) {
      row = await prisma.teacherRate.update({ where: { id: existing.id }, data: { rate } });
    } else {
      row = await prisma.teacherRate.create({
        data: { teacherId: null, level, employmentStatus, classType: 'one_on_one', role: 'main', rate, effectiveFrom: new Date() },
      });
    }
    await auditLog(req.user!.id, 'update', 'teacher_rate', row.id, existing ? { rate: existing.rate } : null, { level, employmentStatus, rate });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save teacher rate' });
  }
});

// ==================== AUDIT VIEWER ====================

// GET /api/admin/audit?entity=&entityId=&userId=&limit=
router.get('/audit', requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.entity) where.entity = req.query.entity;
    if (req.query.entityId) where.entityId = req.query.entityId;
    if (req.query.userId) where.userId = req.query.userId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(req.query.limit) || 100, 500),
      include: { user: { select: { name: true, email: true } } },
    });
    res.json({ data: logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ==================== BACKUP ====================

// GET /api/admin/backup - Full database export as JSON
router.get('/backup', requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      users, roles, leads, students, courses, classes, sessions,
      enrollments, attendances, teachers, receivables, payments,
      adjustments, warnings, payrollPeriods, settings, statusDefs,
    ] = await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true, name: true, phone: true, isActive: true, createdAt: true } }),
      prisma.role.findMany(),
      prisma.lead.findMany({ include: { activities: true, followUps: true, trialTests: true } }),
      prisma.student.findMany({ include: { contacts: true } }),
      prisma.course.findMany(),
      prisma.class.findMany({ include: { classMembers: true } }),
      prisma.session.findMany(),
      prisma.enrollment.findMany({ include: { events: true } }),
      prisma.attendance.findMany(),
      prisma.teacher.findMany({ include: { availability: true, rates: true } }),
      prisma.receivable.findMany(),
      prisma.payment.findMany(),
      prisma.paymentAdjustment.findMany(),
      prisma.academicWarning.findMany(),
      prisma.teacherPayrollPeriod.findMany({ include: { items: true } }),
      prisma.setting.findMany(),
      prisma.statusDefinition.findMany(),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      counts: {
        users: users.length, leads: leads.length, students: students.length,
        courses: courses.length, classes: classes.length, sessions: sessions.length,
        payments: payments.length, teachers: teachers.length,
      },
      data: {
        users, roles, leads, students, courses, classes, sessions,
        enrollments, attendances, teachers, receivables, payments,
        adjustments, warnings, payrollPeriods, settings, statusDefs,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="crm-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(backup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

export default router;
