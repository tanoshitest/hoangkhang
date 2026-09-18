import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission, requireRole } from '../middleware/rbac';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// ==================== HELPERS ====================

// Compute receivable figures: adjusted total, net paid, remaining
async function computeReceivable(receivableId: string) {
  const receivable = await prisma.receivable.findUnique({
    where: { id: receivableId },
    include: {
      payments: { where: { status: 'confirmed' } },
      adjustments: { where: { status: 'approved' } },
    },
  });
  if (!receivable) return null;

  const paid = receivable.payments.reduce((s, p) => s + p.amount, 0);
  let adjustedTotal = receivable.totalAmount;
  let refunded = 0;
  for (const adj of receivable.adjustments) {
    if (adj.type === 'exemption') adjustedTotal -= adj.amount;
    else if (adj.type === 'correction') adjustedTotal += adj.amount;
    else if (adj.type === 'refund' || adj.type === 'transfer') refunded += adj.amount;
  }
  const netPaid = paid - refunded;
  const remaining = Math.max(0, adjustedTotal - netPaid);

  return { receivable, adjustedTotal, paid, refunded, netPaid, remaining };
}

// Recalculate and persist receivable status
async function syncReceivableStatus(receivableId: string) {
  const computed = await computeReceivable(receivableId);
  if (!computed) return;
  const { receivable, adjustedTotal, netPaid, remaining } = computed;
  if (receivable.status === 'cancelled') return;

  let status = 'pending';
  if (remaining <= 0) status = 'paid';
  else if (netPaid > 0) status = 'partial';
  if (status !== 'paid' && receivable.dueDate && new Date(receivable.dueDate) < new Date()) {
    status = 'overdue';
  }
  if (status !== receivable.status) {
    await prisma.receivable.update({ where: { id: receivableId }, data: { status } });
  }
}

async function generatePaymentCode(): Promise<string> {
  const count = await prisma.payment.count();
  return `P${String(count + 1).padStart(6, '0')}`;
}

// ==================== RECEIVABLES ====================

// GET /api/finance/receivables - List with filters
router.get('/receivables', requirePermission('finance', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, studentId, courseId, overdue } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ['paid', 'cancelled'] };
    }

    const receivables = await prisma.receivable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, code: true, name: true, phone: true } },
        course: { select: { id: true, code: true, name: true } },
        payments: { where: { status: 'confirmed' }, select: { amount: true } },
        adjustments: { where: { status: 'approved' }, select: { type: true, amount: true } },
      },
    });

    const data = receivables.map(r => {
      const paid = r.payments.reduce((s, p) => s + p.amount, 0);
      let adjustedTotal = r.totalAmount;
      let refunded = 0;
      for (const adj of r.adjustments) {
        if (adj.type === 'exemption') adjustedTotal -= adj.amount;
        else if (adj.type === 'correction') adjustedTotal += adj.amount;
        else if (adj.type === 'refund' || adj.type === 'transfer') refunded += adj.amount;
      }
      return {
        ...r,
        paidAmount: paid,
        adjustedTotal,
        remaining: Math.max(0, adjustedTotal - (paid - refunded)),
        payments: undefined,
        adjustments: undefined,
      };
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receivables' });
  }
});

// POST /api/finance/receivables - Create receivable
router.post('/receivables', requirePermission('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, courseId, standardFee, discount, scholarship, extraFee, dueDate } = req.body;
    if (!studentId || !courseId || standardFee === undefined) {
      return res.status(400).json({ error: 'studentId, courseId, standardFee required' });
    }

    const totalAmount = (standardFee || 0) - (discount || 0) - (scholarship || 0) + (extraFee || 0);
    if (totalAmount < 0) {
      return res.status(400).json({ error: 'Total amount cannot be negative' });
    }

    const receivable = await prisma.receivable.create({
      data: {
        studentId,
        courseId,
        standardFee,
        discount: discount || 0,
        scholarship: scholarship || 0,
        extraFee: extraFee || 0,
        totalAmount,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: 'pending',
      },
      include: {
        student: { select: { id: true, code: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json(receivable);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create receivable' });
  }
});

// GET /api/finance/receivables/:id - Detail with payments + adjustments
router.get('/receivables/:id', requirePermission('finance', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const receivable = await prisma.receivable.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { id: true, code: true, name: true, phone: true } },
        course: { select: { id: true, code: true, name: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        adjustments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!receivable) return res.status(404).json({ error: 'Receivable not found' });

    const computed = await computeReceivable(receivable.id);
    res.json({ ...receivable, ...computed, receivable: undefined });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receivable' });
  }
});

// PATCH /api/finance/receivables/:id - Update receivable (before any confirmed payment)
router.patch('/receivables/:id', requirePermission('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await prisma.receivable.findUnique({
      where: { id: req.params.id },
      include: { payments: { where: { status: 'confirmed' } } },
    });
    if (!existing) return res.status(404).json({ error: 'Receivable not found' });
    if (existing.payments.length > 0) {
      return res.status(409).json({ error: 'Cannot edit receivable with confirmed payments. Use Adjustment instead.' });
    }

    const { standardFee, discount, scholarship, extraFee, dueDate, status } = req.body;
    const data: any = {};
    if (standardFee !== undefined) data.standardFee = standardFee;
    if (discount !== undefined) data.discount = discount;
    if (scholarship !== undefined) data.scholarship = scholarship;
    if (extraFee !== undefined) data.extraFee = extraFee;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (status === 'cancelled') data.status = 'cancelled';

    const newStandard = data.standardFee ?? existing.standardFee;
    const newDiscount = data.discount ?? existing.discount;
    const newScholarship = data.scholarship ?? existing.scholarship;
    const newExtra = data.extraFee ?? existing.extraFee;
    data.totalAmount = newStandard - newDiscount - newScholarship + newExtra;

    const receivable = await prisma.receivable.update({
      where: { id: req.params.id },
      data,
    });
    await syncReceivableStatus(receivable.id);
    res.json(receivable);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update receivable' });
  }
});

// ==================== PAYMENTS ====================

// GET /api/finance/payments - Reconciliation list with filters
router.get('/payments', requirePermission('finance', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to, method, status, studentId } = req.query;
    const where: any = {};
    if (method) where.method = method;
    if (status) where.status = status;
    if (from || to) {
      where.paymentDate = {};
      if (from) where.paymentDate.gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        where.paymentDate.lte = toDate;
      }
    }
    if (studentId) where.receivable = { studentId: studentId as string };

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        receivable: {
          include: {
            student: { select: { id: true, code: true, name: true } },
            course: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    res.json({ data: payments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST /api/finance/receivables/:id/payments - Record a payment
router.post('/receivables/:id/payments', requirePermission('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const receivable = await prisma.receivable.findUnique({ where: { id: req.params.id } });
    if (!receivable) return res.status(404).json({ error: 'Receivable not found' });
    if (receivable.status === 'cancelled') {
      return res.status(409).json({ error: 'Receivable is cancelled' });
    }

    const { amount, paymentDate, method, reference, receipt } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const payment = await prisma.payment.create({
      data: {
        receivableId: receivable.id,
        code: await generatePaymentCode(),
        amount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        method: method || 'cash',
        reference,
        receipt,
        status: 'pending',
        createdBy: req.user!.id,
      },
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// POST /api/finance/payments/:id/confirm - Confirm payment (BR05: after this, immutable)
router.post('/payments/:id/confirm', requirePermission('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'confirmed') {
      return res.status(409).json({ error: 'Payment already confirmed' });
    }
    if (payment.status === 'cancelled') {
      return res.status(409).json({ error: 'Payment is cancelled' });
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'confirmed',
        confirmedBy: req.user!.id,
        confirmedAt: new Date(),
      },
    });
    await syncReceivableStatus(payment.receivableId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// POST /api/finance/payments/:id/cancel - Cancel a PENDING payment only
router.post('/payments/:id/cancel', requirePermission('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'confirmed') {
      return res.status(409).json({
        error: 'Cannot cancel confirmed payment (BR05). Create an Adjustment instead.',
      });
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'cancelled' },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel payment' });
  }
});

// ==================== ADJUSTMENTS ====================

// GET /api/finance/adjustments - List adjustments
router.get('/adjustments', requirePermission('finance', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, type } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const adjustments = await prisma.paymentAdjustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        receivable: {
          include: {
            student: { select: { id: true, code: true, name: true } },
            course: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    res.json({ data: adjustments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch adjustments' });
  }
});

// POST /api/finance/receivables/:id/adjustments - Create adjustment
router.post('/receivables/:id/adjustments', requirePermission('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const receivable = await prisma.receivable.findUnique({ where: { id: req.params.id } });
    if (!receivable) return res.status(404).json({ error: 'Receivable not found' });

    const { type, amount, reason } = req.body;
    const validTypes = ['refund', 'transfer', 'reserve', 'exemption', 'correction'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }
    if (amount === undefined || !reason) {
      return res.status(400).json({ error: 'amount and reason required' });
    }

    const adjustment = await prisma.paymentAdjustment.create({
      data: {
        receivableId: receivable.id,
        type,
        amount,
        reason,
        status: 'pending',
        createdBy: req.user!.id,
      },
    });
    res.status(201).json(adjustment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create adjustment' });
  }
});

// POST /api/finance/adjustments/:id/approve - Approve adjustment
router.post('/adjustments/:id/approve', requireRole(['admin', 'manager', 'accountant']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adjustment = await prisma.paymentAdjustment.findUnique({ where: { id: req.params.id } });
    if (!adjustment) return res.status(404).json({ error: 'Adjustment not found' });
    if (adjustment.status !== 'pending') {
      return res.status(409).json({ error: `Adjustment already ${adjustment.status}` });
    }

    const updated = await prisma.paymentAdjustment.update({
      where: { id: adjustment.id },
      data: { status: 'approved', approvedBy: req.user!.id },
    });
    await syncReceivableStatus(adjustment.receivableId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve adjustment' });
  }
});

// POST /api/finance/adjustments/:id/reject - Reject adjustment
router.post('/adjustments/:id/reject', requireRole(['admin', 'manager', 'accountant']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adjustment = await prisma.paymentAdjustment.findUnique({ where: { id: req.params.id } });
    if (!adjustment) return res.status(404).json({ error: 'Adjustment not found' });
    if (adjustment.status !== 'pending') {
      return res.status(409).json({ error: `Adjustment already ${adjustment.status}` });
    }

    const updated = await prisma.paymentAdjustment.update({
      where: { id: adjustment.id },
      data: { status: 'rejected', approvedBy: req.user!.id },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject adjustment' });
  }
});

// ==================== DEBT & SUMMARY ====================

// GET /api/finance/debt - Debt list (unpaid/partial receivables)
router.get('/debt', requirePermission('finance', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const receivables = await prisma.receivable.findMany({
      where: { status: { in: ['pending', 'partial', 'overdue'] } },
      orderBy: { dueDate: 'asc' },
      include: {
        student: { select: { id: true, code: true, name: true, phone: true } },
        course: { select: { id: true, code: true, name: true } },
        payments: { where: { status: 'confirmed' }, select: { amount: true } },
        adjustments: { where: { status: 'approved' }, select: { type: true, amount: true } },
      },
    });

    const now = new Date();
    const data = receivables.map(r => {
      const paid = r.payments.reduce((s, p) => s + p.amount, 0);
      let adjustedTotal = r.totalAmount;
      let refunded = 0;
      for (const adj of r.adjustments) {
        if (adj.type === 'exemption') adjustedTotal -= adj.amount;
        else if (adj.type === 'correction') adjustedTotal += adj.amount;
        else if (adj.type === 'refund' || adj.type === 'transfer') refunded += adj.amount;
      }
      const remaining = Math.max(0, adjustedTotal - (paid - refunded));
      const isOverdue = r.dueDate && new Date(r.dueDate) < now;
      const daysOverdue = isOverdue
        ? Math.floor((now.getTime() - new Date(r.dueDate!).getTime()) / 86400000)
        : 0;
      return {
        id: r.id,
        student: r.student,
        course: r.course,
        totalAmount: adjustedTotal,
        paidAmount: paid - refunded,
        remaining,
        dueDate: r.dueDate,
        status: r.status,
        isOverdue: !!isOverdue,
        daysOverdue,
      };
    }).filter(r => r.remaining > 0);

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch debt list' });
  }
});

// GET /api/finance/summary - Finance dashboard summary
router.get('/summary', requirePermission('finance', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [receivables, confirmedPayments, pendingPayments, pendingAdjustments] = await Promise.all([
      prisma.receivable.findMany({
        where: { status: { not: 'cancelled' } },
        include: {
          payments: { where: { status: 'confirmed' }, select: { amount: true } },
          adjustments: { where: { status: 'approved' }, select: { type: true, amount: true } },
        },
      }),
      prisma.payment.aggregate({ where: { status: 'confirmed' }, _sum: { amount: true } }),
      prisma.payment.count({ where: { status: 'pending' } }),
      prisma.paymentAdjustment.count({ where: { status: 'pending' } }),
    ]);

    let totalReceivable = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    const now = new Date();

    for (const r of receivables) {
      const paid = r.payments.reduce((s, p) => s + p.amount, 0);
      let adjustedTotal = r.totalAmount;
      let refunded = 0;
      for (const adj of r.adjustments) {
        if (adj.type === 'exemption') adjustedTotal -= adj.amount;
        else if (adj.type === 'correction') adjustedTotal += adj.amount;
        else if (adj.type === 'refund' || adj.type === 'transfer') refunded += adj.amount;
      }
      const remaining = Math.max(0, adjustedTotal - (paid - refunded));
      totalReceivable += adjustedTotal;
      totalPaid += paid;
      totalRemaining += remaining;
      if (remaining > 0 && r.dueDate && new Date(r.dueDate) < now) {
        overdueCount++;
        overdueAmount += remaining;
      }
    }

    res.json({
      totalReceivable,
      totalCollected: confirmedPayments._sum.amount || 0,
      totalRemaining,
      overdueCount,
      overdueAmount,
      pendingPayments,
      pendingAdjustments,
      receivableCount: receivables.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET /api/finance/student-status/:studentId - Teacher-safe view (status only, no amounts)
router.get('/student-status/:studentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const receivables = await prisma.receivable.findMany({
      where: { studentId: req.params.studentId, status: { not: 'cancelled' } },
      include: {
        course: { select: { code: true, name: true } },
        payments: { where: { status: 'confirmed' }, select: { amount: true } },
        adjustments: { where: { status: 'approved' }, select: { type: true, amount: true } },
      },
    });

    const data = receivables.map(r => {
      const paid = r.payments.reduce((s, p) => s + p.amount, 0);
      let adjustedTotal = r.totalAmount;
      let refunded = 0;
      for (const adj of r.adjustments) {
        if (adj.type === 'exemption') adjustedTotal -= adj.amount;
        else if (adj.type === 'correction') adjustedTotal += adj.amount;
        else if (adj.type === 'refund' || adj.type === 'transfer') refunded += adj.amount;
      }
      const completed = adjustedTotal - (paid - refunded) <= 0;
      return {
        course: r.course,
        feeStatus: completed ? 'completed' : 'not_completed',
      };
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student fee status' });
  }
});

export default router;
