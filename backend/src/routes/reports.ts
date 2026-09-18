import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// ==================== EXECUTIVE DASHBOARD ====================

// GET /api/reports/dashboard - All-in-one executive stats
router.get('/dashboard', requirePermission('reports', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

    const [
      leadNew, leadFollowUpDue, leadFollowUpOverdue,
      studentsByStatus,
      classRecruiting, classStudying, classes,
      openWarnings,
      receivables, confirmedPaymentsAgg,
      teacherWorkload,
      sessionsToday,
    ] = await Promise.all([
      prisma.lead.count({ where: { status: 'new' } }),
      prisma.leadFollowUp.count({ where: { status: 'scheduled', date: { gte: todayStart } } }),
      prisma.leadFollowUp.count({ where: { status: 'scheduled', date: { lt: todayStart } } }),
      prisma.student.groupBy({ by: ['status'], _count: true }),
      prisma.class.count({ where: { status: 'recruiting' } }),
      prisma.class.count({ where: { status: 'studying' } }),
      prisma.class.findMany({ select: { maxStudents: true, studyingStudents: true, status: true } }),
      prisma.academicWarning.count({ where: { status: { notIn: ['resolved', 'closed'] } } }),
      prisma.receivable.findMany({
        where: { status: { not: 'cancelled' } },
        include: {
          payments: { where: { status: 'confirmed' }, select: { amount: true } },
          adjustments: { where: { status: 'approved' }, select: { type: true, amount: true } },
        },
      }),
      prisma.payment.aggregate({ where: { status: 'confirmed' }, _sum: { amount: true } }),
      prisma.session.count({ where: { status: { in: ['taught', 'makeup'] } } }),
      prisma.session.count({
        where: { date: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) } },
      }),
    ]);

    // Students by status
    const studentStats: Record<string, number> = {};
    for (const s of studentsByStatus) studentStats[s.status] = s._count;

    // Class fill rate
    let capacity = 0, enrolled = 0;
    for (const c of classes) {
      if (c.status === 'studying' || c.status === 'recruiting') {
        capacity += c.maxStudents || 0;
        enrolled += c.studyingStudents;
      }
    }
    const fillRate = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;

    // Finance totals
    let totalReceivable = 0, totalRemaining = 0, overdueAmount = 0, overdueCount = 0;
    for (const r of receivables) {
      const paid = r.payments.reduce((s, p) => s + p.amount, 0);
      let adjusted = r.totalAmount, refunded = 0;
      for (const a of r.adjustments) {
        if (a.type === 'exemption') adjusted -= a.amount;
        else if (a.type === 'correction') adjusted += a.amount;
        else if (a.type === 'refund' || a.type === 'transfer') refunded += a.amount;
      }
      const remaining = Math.max(0, adjusted - (paid - refunded));
      totalReceivable += adjusted;
      totalRemaining += remaining;
      if (remaining > 0 && r.dueDate && new Date(r.dueDate) < now) {
        overdueCount++;
        overdueAmount += remaining;
      }
    }

    res.json({
      leads: {
        new: leadNew,
        followUpDue: leadFollowUpDue,
        followUpOverdue: leadFollowUpOverdue,
      },
      students: {
        studying: studentStats['studying'] || 0,
        waitingClass: studentStats['waiting_class'] || 0,
        reserved: studentStats['reserved'] || 0,
        dropped: studentStats['dropped'] || 0,
        completed: studentStats['completed'] || 0,
        transferred: studentStats['transferred'] || 0,
      },
      classes: {
        recruiting: classRecruiting,
        studying: classStudying,
        capacity,
        enrolled,
        fillRate,
      },
      warnings: { open: openWarnings },
      finance: {
        totalReceivable,
        totalCollected: confirmedPaymentsAgg._sum.amount || 0,
        totalRemaining,
        overdueCount,
        overdueAmount,
      },
      teachers: { taughtSessions: teacherWorkload },
      today: { sessions: sessionsToday },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ==================== SALES REPORT ====================

// GET /api/reports/sales?from=&to=
router.get('/sales', requirePermission('reports', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from as string);
      if (req.query.to) {
        const to = new Date(req.query.to as string);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        trialTests: true,
      },
    });

    const total = leads.length;
    const bySource: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byAssignee: Record<string, { total: number; converted: number }> = {};
    const notRegisteredReasons: Record<string, number> = {};
    let contacted = 0, trialed = 0, converted = 0;

    for (const l of leads) {
      bySource[l.source || 'Không rõ'] = (bySource[l.source || 'Không rõ'] || 0) + 1;
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;

      const assignee = l.assignedTo?.name || 'Chưa phân công';
      if (!byAssignee[assignee]) byAssignee[assignee] = { total: 0, converted: 0 };
      byAssignee[assignee].total++;

      if (l.status !== 'new' && l.status !== 'assigned') contacted++;
      if (l.trialTests.length > 0) trialed++;
      if (l.status === 'registered') {
        converted++;
        byAssignee[assignee].converted++;
      }
      if (l.status === 'not_registered' && l.notRegisteredReason) {
        notRegisteredReasons[l.notRegisteredReason] = (notRegisteredReasons[l.notRegisteredReason] || 0) + 1;
      }
    }

    res.json({
      total,
      contacted,
      contactRate: total > 0 ? Math.round((contacted / total) * 100) : 0,
      trialed,
      converted,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      bySource,
      byStatus,
      byAssignee,
      notRegisteredReasons,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales report' });
  }
});

// ==================== STUDENT REPORT ====================

// GET /api/reports/students
router.get('/students', requirePermission('reports', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      select: { status: true, createdAt: true, enrollments: { select: { id: true } } },
    });

    const byStatus: Record<string, number> = {};
    let reRegistered = 0;
    for (const s of students) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
      if (s.enrollments.length > 1) reRegistered++;
    }

    res.json({ total: students.length, byStatus, reRegistered });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student report' });
  }
});

// ==================== CLASS REPORT ====================

// GET /api/reports/classes
router.get('/classes', requirePermission('reports', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        course: { select: { code: true, name: true, totalSessions: true } },
        _count: { select: { sessions: { where: { status: 'taught' } } } },
      },
      orderBy: { startDate: 'desc' },
    });

    const data = classes.map(c => {
      const taught = c._count.sessions;
      const total = c.course.totalSessions || 0;
      return {
        id: c.id,
        code: c.code,
        course: c.course.name,
        status: c.status,
        studyingStudents: c.studyingStudents,
        maxStudents: c.maxStudents,
        fillRate: c.maxStudents ? Math.round((c.studyingStudents / c.maxStudents) * 100) : 0,
        taughtSessions: taught,
        totalSessions: total,
        progress: total > 0 ? Math.round((taught / total) * 100) : 0,
      };
    });

    const byStatus: Record<string, number> = {};
    for (const c of classes) byStatus[c.status] = (byStatus[c.status] || 0) + 1;

    res.json({ total: classes.length, byStatus, classes: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch class report' });
  }
});

// ==================== ACADEMIC REPORT ====================

// GET /api/reports/academic
router.get('/academic', requirePermission('reports', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [attendances, assessments, warnings] = await Promise.all([
      prisma.attendance.groupBy({ by: ['status'], _count: true }),
      prisma.assessment.findMany({ select: { score: true, maxScore: true } }),
      prisma.academicWarning.groupBy({ by: ['status', 'type'], _count: true }),
    ]);

    const attStats: Record<string, number> = {};
    let totalAtt = 0;
    for (const a of attendances) {
      attStats[a.status] = a._count;
      totalAtt += a._count;
    }
    const present = (attStats['present'] || 0) + (attStats['late'] || 0) + (attStats['left_early'] || 0);
    const attendanceRate = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : 0;

    let scoreSum = 0, scoreCount = 0;
    for (const a of assessments) {
      if (a.score !== null && a.maxScore && a.maxScore > 0) {
        scoreSum += (a.score / a.maxScore) * 10; // normalize to /10
        scoreCount++;
      }
    }
    const avgScore = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null;

    const warningsByType: Record<string, number> = {};
    const warningsByStatus: Record<string, number> = {};
    for (const w of warnings) {
      warningsByType[w.type] = (warningsByType[w.type] || 0) + w._count;
      warningsByStatus[w.status] = (warningsByStatus[w.status] || 0) + w._count;
    }

    res.json({
      attendance: { total: totalAtt, rate: attendanceRate, byStatus: attStats },
      avgScore,
      assessmentCount: scoreCount,
      warnings: { byType: warningsByType, byStatus: warningsByStatus },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch academic report' });
  }
});

// ==================== FINANCE REPORT ====================

// GET /api/reports/finance?from=&to= - Revenue over time
router.get('/finance', requirePermission('reports', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const from = req.query.from ? new Date(req.query.from as string) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();
    to.setHours(23, 59, 59, 999);

    const payments = await prisma.payment.findMany({
      where: { status: 'confirmed', paymentDate: { gte: from, lte: to } },
      select: { amount: true, paymentDate: true, method: true },
      orderBy: { paymentDate: 'asc' },
    });

    const byDay: Record<string, number> = {};
    const byMethod: Record<string, number> = {};
    let total = 0;
    for (const p of payments) {
      const day = p.paymentDate.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + p.amount;
      byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
      total += p.amount;
    }

    res.json({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      totalCollected: total,
      paymentCount: payments.length,
      byDay,
      byMethod,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch finance report' });
  }
});

// ==================== TEACHER REPORT ====================

// GET /api/reports/teachers?from=&to=
router.get('/teachers', requirePermission('reports', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = { status: { in: ['taught', 'makeup'] } };
    if (req.query.from || req.query.to) {
      where.date = {};
      if (req.query.from) where.date.gte = new Date(req.query.from as string);
      if (req.query.to) {
        const to = new Date(req.query.to as string);
        to.setHours(23, 59, 59, 999);
        where.date.lte = to;
      }
    }

    const sessions = await prisma.session.findMany({
      where,
      include: { teacher: { select: { id: true, code: true, name: true } } },
    });

    const periods = await prisma.teacherPayrollPeriod.findMany({
      where: { teacherId: { in: sessions.map(s => s.teacherId) } },
      select: { teacherId: true, status: true, totalAmount: true, totalHours: true, periodStart: true },
      orderBy: { periodStart: 'desc' },
    });

    const byTeacher: Record<string, any> = {};
    for (const s of sessions) {
      const hours = s.calculatedHours ||
        Math.max(0, (parseInt(s.endTime) * 60 + parseInt(s.endTime.split(':')[1] || '0')
          - parseInt(s.startTime) * 60 - parseInt(s.startTime.split(':')[1] || '0')) / 60);
      if (!byTeacher[s.teacherId]) {
        byTeacher[s.teacherId] = {
          teacher: s.teacher, totalHours: 0, sessions: 0,
          makeup: 0, payrollStatus: 'none', estimatedPay: 0,
        };
      }
      byTeacher[s.teacherId].totalHours += hours;
      byTeacher[s.teacherId].sessions++;
      if (s.status === 'makeup') byTeacher[s.teacherId].makeup++;
    }

    for (const p of periods) {
      if (byTeacher[p.teacherId]) {
        // periods sorted desc by periodStart — first one wins for status
        if (byTeacher[p.teacherId].payrollStatus === 'none') {
          byTeacher[p.teacherId].payrollStatus = p.status;
        }
        byTeacher[p.teacherId].estimatedPay += p.totalAmount;
      }
    }

    res.json({ data: Object.values(byTeacher) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teacher report' });
  }
});

// ==================== CSV EXPORT ====================

// GET /api/reports/export/:type?format=csv - CSV export
router.get('/export/:type', requirePermission('reports', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = req.params;
    let csv = '';
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    if (type === 'leads') {
      const leads = await prisma.lead.findMany({
        include: { assignedTo: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      csv = 'Code,Name,Phone,Email,Source,Status,Assigned,CreatedAt\n' +
        leads.map(l => [l.code, l.name, l.phone, l.email, l.source, l.status, l.assignedTo?.name, l.createdAt.toISOString().slice(0, 10)].map(esc).join(',')).join('\n');
    } else if (type === 'students') {
      const students = await prisma.student.findMany({ orderBy: { createdAt: 'desc' } });
      csv = 'Code,Name,Phone,Email,Status,CreatedAt\n' +
        students.map(s => [s.code, s.name, s.phone, s.email, s.status, s.createdAt.toISOString().slice(0, 10)].map(esc).join(',')).join('\n');
    } else if (type === 'payments') {
      const payments = await prisma.payment.findMany({
        where: { status: 'confirmed' },
        include: { receivable: { include: { student: { select: { code: true, name: true } } } } },
        orderBy: { paymentDate: 'desc' },
      });
      csv = 'Code,Student,Amount,Method,Date,Reference\n' +
        payments.map(p => [p.code, `${p.receivable.student.name} (${p.receivable.student.code})`, p.amount, p.method, p.paymentDate.toISOString().slice(0, 10), p.reference].map(esc).join(',')).join('\n');
    } else if (type === 'debt') {
      const receivables = await prisma.receivable.findMany({
        where: { status: { in: ['pending', 'partial', 'overdue'] } },
        include: {
          student: { select: { code: true, name: true } },
          course: { select: { code: true, name: true } },
          payments: { where: { status: 'confirmed' }, select: { amount: true } },
        },
      });
      csv = 'Student,Course,Total,Paid,Remaining,DueDate,Status\n' +
        receivables.map(r => {
          const paid = r.payments.reduce((s, p) => s + p.amount, 0);
          return [`${r.student.name} (${r.student.code})`, r.course.name, r.totalAmount, paid, r.totalAmount - paid, r.dueDate?.toISOString().slice(0, 10), r.status].map(esc).join(',');
        }).join('\n');
    } else {
      return res.status(400).json({ error: 'Invalid export type. Use: leads, students, payments, debt' });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);
    res.send('﻿' + csv); // BOM for Excel UTF-8
  } catch (error) {
    res.status(500).json({ error: 'Failed to export' });
  }
});

export default router;
