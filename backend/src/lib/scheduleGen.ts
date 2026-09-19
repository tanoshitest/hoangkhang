import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export const HORIZON_WEEKS = 10;

export interface ScheduleSlot {
  day: number; // 0=CN, 1=T2 ... 6=T7 (JS getDay)
  startTime: string; // "HH:MM"
  endTime: string;
  teacherId?: string;
}

export function parseSlots(raw: unknown): ScheduleSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s.day === 'number' && s.startTime && s.endTime)
    .map((s) => ({ day: s.day, startTime: s.startTime, endTime: s.endTime, teacherId: s.teacherId || undefined }));
}

function hoursBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 30) / 2;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function teacherBusy(teacherId: string, date: Date, startTime: string, endTime: string): Promise<boolean> {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const next = new Date(day);
  next.setUTCDate(next.getUTCDate() + 1);
  const sameDay = await prisma.session.findMany({
    where: { teacherId, date: { gte: day, lt: next }, status: { not: 'cancelled' } },
    select: { startTime: true, endTime: true },
  });
  const s = toMinutes(startTime);
  const e = toMinutes(endTime);
  return sameDay.some((x) => toMinutes(x.startTime) < e && s < toMinutes(x.endTime));
}

// Sinh sessions 'planned' cho lớp theo scheduleSlots.
// horizonWeeks=null → tới hết endDate; nếu không → min(endDate, today+horizonWeeks)
// Chỉ fill buổi còn thiếu — không đụng buổi đã có (kể cả taught/makeup/có điểm danh)
export async function generateClassSessions(classId: string, horizonWeeks: number | null = HORIZON_WEEKS): Promise<{ created: number; skippedBusy: number }> {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return { created: 0, skippedBusy: 0 };
  const slots = parseSlots(cls.scheduleSlots);
  if (!slots.length || !cls.startDate || !cls.endDate) return { created: 0, skippedBusy: 0 };

  const today = new Date();
  const from = new Date(Math.max(today.setUTCHours(0, 0, 0, 0), cls.startDate.getTime()));
  const horizon = new Date(from);
  horizon.setUTCDate(horizon.getUTCDate() + (horizonWeeks ?? 0) * 7);
  const to = horizonWeeks === null ? cls.endDate : new Date(Math.min(cls.endDate.getTime(), horizon.getTime()));

  let created = 0;
  let skippedBusy = 0;
  const candidates = [cls.mainTeacherId, cls.supportTeacherId].filter(Boolean) as string[];

  for (const d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const slot = slots.find((s) => s.day === d.getUTCDay());
    if (!slot) continue;
    const exists = await prisma.session.findFirst({ where: { classId, date: d, startTime: slot.startTime } });
    if (exists) continue;

    const teacherOrder = [slot.teacherId, ...candidates].filter(Boolean) as string[];
    let teacherId: string | null = null;
    for (const t of teacherOrder) {
      if (!(await teacherBusy(t, d, slot.startTime, slot.endTime))) { teacherId = t; break; }
    }
    if (!teacherId) { skippedBusy++; continue; }

    await prisma.session.create({
      data: {
        classId,
        teacherId,
        date: new Date(d),
        startTime: slot.startTime,
        endTime: slot.endTime,
        calculatedHours: hoursBetween(slot.startTime, slot.endTime),
        status: 'planned',
      },
    });
    created++;
  }
  return { created, skippedBusy };
}

// Đổi lịch: xóa buổi 'planned' tương lai chưa đụng (không điểm danh, chưa dạy) rồi sinh lại tới hết endDate
export async function regenerateFutureSessions(classId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const removed = await prisma.session.deleteMany({
    where: {
      classId,
      status: 'planned',
      date: { gte: today },
      attendances: { none: {} },
    },
  });
  const gen = await generateClassSessions(classId, null);
  return { removed: removed.count, ...gen };
}

// Scheduler: duy trì sessions planned rolling cho mọi lớp đang chạy có pattern
export async function rollingGenerateAll(horizonWeeks = HORIZON_WEEKS) {
  const classes = await prisma.class.findMany({
    where: {
      status: { in: ['studying', 'recruiting'] },
      scheduleSlots: { not: Prisma.DbNull },
      endDate: { gte: new Date() },
    },
    select: { id: true, code: true },
  });
  let total = 0;
  for (const c of classes) {
    const r = await generateClassSessions(c.id, horizonWeeks);
    total += r.created;
  }
  if (total) console.log(`📅 Auto-generated ${total} sessions across ${classes.length} classes`);
  return { classes: classes.length, created: total };
}
