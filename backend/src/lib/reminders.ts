import { PrismaClient } from '@prisma/client';
import { getNum } from './settings';

const prisma = new PrismaClient();

const WARNING_TYPE_LABELS: Record<string, string> = {
  consecutive_absent: 'vắng liên tiếp', low_attendance: 'điểm danh thấp',
  below_standard: 'dưới chuẩn', no_homework: 'không làm BTVN',
  dropout_risk: 'nguy cơ nghỉ',
};

/**
 * Quét các quy tắc nhắc việc, tạo Notification (dedupe theo title trong 24h).
 * Được gọi bởi scheduler định kỳ + endpoint /api/notifications/scan thủ công.
 */
export async function runReminderScan(): Promise<{ created: number; titles: string[] }> {
  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 86400000);
  const sevenDays = new Date(now.getTime() + 7 * 86400000);
  const created: string[] = [];

  // Gửi cho các user thuộc roles, dedupe theo title trong 24h
  const notifyRoles = async (roles: string[], type: string, title: string, content: string) => {
    const users = await prisma.user.findMany({
      where: { roles: { some: { role: { name: { in: roles } } } } },
      select: { id: true },
    });
    for (const u of users) {
      const existing = await prisma.notification.findFirst({
        where: { userId: u.id, title, createdAt: { gte: new Date(now.getTime() - 86400000) } },
      });
      if (!existing) {
        await prisma.notification.create({ data: { userId: u.id, type, title, content } });
        created.push(title);
      }
    }
  };

  const notify = (type: string, title: string, content: string) =>
    notifyRoles(['admin', 'manager'], type, title, content);

  const notifyUser = async (userId: string | null | undefined, type: string, title: string, content: string) => {
    if (!userId) return;
    const existing = await prisma.notification.findFirst({
      where: { userId, title, createdAt: { gte: new Date(now.getTime() - 86400000) } },
    });
    if (!existing) {
      await prisma.notification.create({ data: { userId, type, title, content } });
      created.push(title);
    }
  };

  // Rule 1: Leads mới chưa liên hệ > 2 ngày
  const staleLeads = await prisma.lead.findMany({
    where: { status: { in: ['new', 'assigned'] }, createdAt: { lt: new Date(now.getTime() - 2 * 86400000) } },
    take: 10,
  });
  for (const l of staleLeads) {
    await notify('lead_reminder', `KH tiềm năng ${l.name} chưa được liên hệ`, `KH tiềm năng ${l.code} - ${l.phone} tạo ngày ${l.createdAt.toISOString().slice(0, 10)} chưa có hoạt động.`);
  }

  // Rule 2: Follow-up đến hạn/quá hạn
  const dueFollowUps = await prisma.leadFollowUp.findMany({
    where: { status: 'scheduled', date: { lte: threeDays } },
    include: { lead: { select: { code: true, name: true, assignedToId: true } } },
    take: 20,
  });
  for (const f of dueFollowUps) {
    const overdue = f.date < now;
    await notify(
      'followup_due',
      `Chăm sóc ${overdue ? 'quá hạn' : 'sắp đến hạn'}: ${f.lead.name}`,
      `KH tiềm năng ${f.lead.code} - hẹn ${f.date.toISOString().slice(0, 10)}${f.content ? ` - ${f.content}` : ''}`
    );
  }

  // Rule 3: Lớp sắp khai giảng trong 7 ngày mà chưa đủ sĩ số
  const startingClasses = await prisma.class.findMany({
    where: { status: 'recruiting', startDate: { gte: now, lte: sevenDays } },
  });
  for (const c of startingClasses) {
    if (c.maxStudents && c.studyingStudents < c.maxStudents * 0.5) {
      await notify(
        'class_starting',
        `Lớp ${c.code} sắp khai giảng nhưng thiếu sĩ số`,
        `Khai giảng ${c.startDate.toISOString().slice(0, 10)} - hiện có ${c.studyingStudents}/${c.maxStudents} học viên.`
      );
    }
  }

  // Rule 4: Công nợ đến hạn trong 7 ngày hoặc quá hạn → kế toán + quản lý
  const dueReceivables = await prisma.receivable.findMany({
    where: {
      status: { in: ['pending', 'partial'] },
      dueDate: { lte: sevenDays },
    },
    include: {
      student: { select: { code: true, name: true } },
      payments: { where: { status: 'confirmed' }, select: { amount: true } },
    },
    take: 20,
  });
  for (const r of dueReceivables) {
    const paid = r.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = r.totalAmount - paid;
    if (remaining <= 0) continue;
    const overdue = r.dueDate! < now;
    await notifyRoles(
      ['admin', 'manager', 'accountant'],
      'debt_due',
      `Công nợ ${overdue ? 'quá hạn' : 'sắp đến hạn'}: ${r.student.name}`,
      `${r.student.code} còn nợ ${remaining.toLocaleString('vi-VN')}đ - hạn ${r.dueDate!.toISOString().slice(0, 10)}`
    );
  }

  // Rule 5: Cảnh báo học tập mới chưa xử lý > 3 ngày
  const staleWarnings = await prisma.academicWarning.findMany({
    where: { status: 'new', createdAt: { lt: new Date(now.getTime() - 3 * 86400000) } },
    include: { student: { select: { code: true, name: true } } },
    take: 10,
  });
  for (const w of staleWarnings) {
    await notifyRoles(
      ['admin', 'manager', 'academic'],
      'warning_stale',
      `Cảnh báo ${WARNING_TYPE_LABELS[w.type] || w.type} của ${w.student.name} chưa xử lý`,
      `Tạo ngày ${w.createdAt.toISOString().slice(0, 10)} - đã ${Math.floor((now.getTime() - w.createdAt.getTime()) / 86400000)} ngày.`
    );
  }

  // Rule 6: Lớp sắp kết thúc trong 7 ngày
  const endingClasses = await prisma.class.findMany({
    where: { status: 'studying', endDate: { gte: now, lte: sevenDays } },
  });
  for (const c of endingClasses) {
    await notify(
      'class_ending',
      `Lớp ${c.code} sắp kết thúc`,
      `Kết thúc ${c.endDate.toISOString().slice(0, 10)} - ${c.studyingStudents} học viên cần xử lý tiếp.`
    );
  }

  // Rule 7: Buổi học ngày mai → GV + HV trong lớp (portal)
  const remindHours = await getNum('session_remind_hours', 24);
  const tomorrowStart = new Date(now); tomorrowStart.setHours(0, 0, 0, 0); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000);
  if (remindHours > 0) {
    const tomorrowSessions = await prisma.session.findMany({
      where: { date: { gte: tomorrowStart, lt: tomorrowEnd }, status: { in: ['planned', 'makeup'] } },
      include: {
        teacher: { select: { userAccount: { select: { id: true } } } },
        class: {
          select: {
            code: true,
            classMembers: {
              where: { status: 'active' },
              select: { student: { select: { userAccount: { select: { id: true } } } } },
            },
          },
        },
      },
      take: 50,
    });
    for (const s of tomorrowSessions) {
      const dateStr = s.date.toISOString().slice(0, 10);
      const title = `Ngày mai ${dateStr} có buổi học lớp ${s.class.code}`;
      const content = `Buổi ${s.startTime}-${s.endTime}${s.plannedContent ? ` - ${s.plannedContent}` : ''}.`;
      await notifyUser(s.teacher.userAccount?.id, 'session_reminder', title, content);
      for (const m of s.class.classMembers) {
        await notifyUser(m.student.userAccount?.id, 'session_reminder', title, content);
      }
    }
  }

  // Rule 8: Bảo lưu quá hạn (suspendUntil đã qua, vẫn suspended) → đào tạo + quản lý
  const overdueSuspensions = await prisma.enrollment.findMany({
    where: { status: 'suspended', suspendUntil: { lt: now } },
    include: { student: { select: { code: true, name: true } } },
    take: 20,
  });
  for (const e of overdueSuspensions) {
    await notifyRoles(
      ['admin', 'manager', 'academic'],
      'suspension_overdue',
      `Bảo lưu quá hạn: ${e.student.name}`,
      `HV ${e.student.code} hết hạn bảo lưu ngày ${e.suspendUntil!.toISOString().slice(0, 10)} — quá hạn mất học phí, cần xử lý.`
    );
  }

  // Rule 9: Thứ 7 — nhắc chốt lương tuần → kế toán + admin
  if (now.getDay() === 6) {
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const drafts = await prisma.teacherPayrollPeriod.count({
      where: { status: 'draft', periodStart: { gte: new Date(weekStart.getTime() - 14 * 86400000) } },
    });
    const weekSessions = await prisma.session.count({
      where: { date: { gte: weekStart, lt: new Date(weekStart.getTime() + 7 * 86400000) }, status: { in: ['taught', 'makeup'] } },
    });
    await notifyRoles(
      ['admin', 'accountant'],
      'payroll_weekly',
      `Chốt lương tuần kết thúc ${now.toISOString().slice(0, 10)}`,
      `Tuần này có ${weekSessions} buổi dạy; ${drafts} kỳ lương nháp cần xác nhận.`
    );
  }

  // Rule 10: Hoa hồng đủ điều kiện chưa chi > 3 ngày → kế toán + admin
  const staleCommissions = await prisma.commission.findMany({
    where: { status: 'eligible', updatedAt: { lt: new Date(now.getTime() - 3 * 86400000) } },
    include: { user: { select: { name: true } } },
    take: 20,
  });
  for (const c of staleCommissions) {
    const payeeName = c.user?.name || c.ctvName || 'CTV';
    await notifyRoles(
      ['admin', 'accountant'],
      'commission_unpaid',
      `Hoa hồng chờ chi: ${payeeName}`,
      `${c.amount.toLocaleString('vi-VN')}đ đủ điều kiện từ ${c.updatedAt.toISOString().slice(0, 10)} chưa được chi.`
    );
  }

  return { created: created.length, titles: created };
}
