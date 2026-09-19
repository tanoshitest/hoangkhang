import { PrismaClient } from '@prisma/client';
import { getNum } from './settings';

const prisma = new PrismaClient();

export interface DiscountInput {
  type: 'full_course' | 'relative' | 'ctv' | 'promo';
  note?: string;
}

export interface FeePeriod {
  periodType: 'block' | 'monthly' | 'deposit';
  periodLabel: string;
  amount: number;
  dueDate?: Date;
}

export interface FeeResult {
  classType: 'group' | 'one_on_one';
  priceTier: string | null;
  billingType: 'block' | 'monthly';
  totalHours: number;
  unitPrice: number;
  grossFee: number;
  discountPct: number;
  discountDetail: { type: string; pct: number; note?: string }[];
  finalFee: number;
  revenuePerHour: number;
  depositApplied: number;
  periods: FeePeriod[];
}

const DISCOUNT_SETTING: Record<string, string> = {
  full_course: 'discount_full_course',
  relative: 'discount_relative',
  ctv: 'discount_ctv_enrolled',
};

/**
 * Compute enrollment fee per spec:
 * - Group: price tier locked at enrollment (2-5 or 6-10 by current class size),
 *   billed by blocks; discounts stack, capped at discount_cap (20%).
 * - 1-1: billed monthly, hourly rate, no discounts.
 */
export async function computeEnrollmentFee(input: {
  courseId: string;
  classType: 'group' | 'one_on_one';
  classId?: string | null;
  priceTier?: string | null;
  discounts?: DiscountInput[];
  promoPct?: number;
  monthlyHours?: number | null;
  hasDeposit?: boolean;
}): Promise<FeeResult> {
  const course = await prisma.course.findUnique({ where: { id: input.courseId } });
  if (!course) throw new Error('Course not found');

  const cap = await getNum('discount_cap', 0.2);
  const depositAmount = await getNum('deposit_amount', 500000);
  const tier25Max = await getNum('tier_2_5_max', 5);

  let classSize = 0;
  if (input.classType === 'group' && input.classId) {
    const cls = await prisma.class.findUnique({ where: { id: input.classId } });
    if (!cls) throw new Error('Class not found');
    classSize = cls.studyingStudents || cls.currentStudents || 0;
  }

  // Price tier locked at enrollment: current size + this student
  const priceTier =
    input.classType === 'group'
      ? input.priceTier || (classSize + 1 <= tier25Max ? '2-5' : '6-10')
      : null;

  const totalHours =
    input.classType === 'group'
      ? course.hoursGroup || course.totalHours || 0
      : course.hoursOneOnOne || course.totalHours || 0;

  const unitPrice =
    input.classType === 'group'
      ? priceTier === '2-5'
        ? course.priceGroup2to5 || 0
        : course.priceGroup6to10 || 0
      : course.priceOneOnOne || 0;

  if (!totalHours || !unitPrice) {
    throw new Error(`Course ${course.code} is missing hours/price for ${input.classType}`);
  }

  // Discounts: only for group classes (spec Q15)
  const discountDetail: { type: string; pct: number; note?: string }[] = [];
  if (input.classType === 'group') {
    for (const d of input.discounts || []) {
      const key = DISCOUNT_SETTING[d.type];
      const pct = key ? await getNum(key, 0) : input.promoPct || 0;
      if (pct > 0) discountDetail.push({ type: d.type, pct, note: d.note });
    }
  }
  const discountPct = Math.min(
    cap,
    discountDetail.reduce((s, d) => s + d.pct, 0)
  );

  const billingType = input.classType === 'group' ? 'block' : 'monthly';

  const periods: FeePeriod[] = [];
  let grossFee: number;
  let finalFee: number;

  if (billingType === 'block') {
    grossFee = totalHours * unitPrice;
    finalFee = Math.round(grossFee * (1 - discountPct));
    const blockHours = course.blockHours || totalHours;
    const blockCount = Math.ceil(totalHours / blockHours);
    for (let i = 0; i < blockCount; i++) {
      const hours = Math.min(blockHours, totalHours - i * blockHours);
      const amount = Math.round(hours * unitPrice * (1 - discountPct));
      periods.push({
        periodType: 'block',
        periodLabel: `Block ${i + 1} (${hours} giờ)`,
        amount,
        dueDate: i === 0 ? new Date() : undefined,
      });
    }
  } else {
    // 1-1: monthly billing — monthlyHours × unitPrice per month
    const mh = input.monthlyHours || 0;
    if (!mh || mh <= 0) throw new Error('monthlyHours required for one_on_one enrollment');
    const months = Math.ceil(totalHours / mh);
    grossFee = totalHours * unitPrice;
    finalFee = grossFee;
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const hours = Math.min(mh, totalHours - i * mh);
      const due = new Date(now.getFullYear(), now.getMonth() + i, 1);
      periods.push({
        periodType: 'monthly',
        periodLabel: `Tháng ${due.getMonth() + 1}/${due.getFullYear()} (${hours} giờ)`,
        amount: Math.round(hours * unitPrice),
        dueDate: due,
      });
    }
  }

  const revenuePerHour = totalHours > 0 ? finalFee / totalHours : 0;
  const deposit = input.hasDeposit ? Math.min(depositAmount, finalFee) : 0;
  if (deposit > 0) {
    periods.unshift({
      periodType: 'deposit',
      periodLabel: 'Cọc giữ chỗ',
      amount: deposit,
      dueDate: new Date(),
    });
  }

  return {
    classType: input.classType,
    priceTier,
    billingType,
    totalHours,
    unitPrice,
    grossFee,
    discountPct,
    discountDetail,
    finalFee,
    revenuePerHour,
    depositApplied: deposit,
    periods,
  };
}
