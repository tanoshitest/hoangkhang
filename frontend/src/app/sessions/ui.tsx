"use client";

import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { cn, WEEKDAY_LABELS, WEEKDAY_SHORT, timeToMinutes } from "@/lib/utils";
import {
  addDaysUtc,
  dateKey,
  eachDayUtc,
  endOfMonthUtc,
  formatDateUtc,
  formatDayMonth,
  formatMonthLabel,
  startOfMonthUtc,
  startOfWeekUtc,
  todayUtc,
} from "@/lib/date";

/**
 * Giao diện lịch dạy — clone từ NZeducation `/lich-day`.
 * Khác bản gốc: điều hướng bằng `<Link>` (SPA), thẻ buổi mở trang chi tiết,
 * màu thẻ theo lớp (`classTone`), icon trạng thái theo status của HK.
 */

export const CALENDAR_VIEWS = ["day", "week", "month"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

const VIEW_LABEL: Record<CalendarView, string> = {
  day: "Ngày",
  week: "Tuần",
  month: "Tháng",
};

export function parseView(raw?: string | null): CalendarView {
  return (CALENDAR_VIEWS as readonly string[]).includes(raw ?? "")
    ? (raw as CalendarView)
    : "week";
}

/** Khoảng ngày cần truy vấn cho từng chế độ xem. Tháng luôn lấy tròn tuần để lưới đủ ô. */
export function calendarRange(view: CalendarView, date: Date) {
  if (view === "day") return { from: date, to: date };
  if (view === "week") {
    const from = startOfWeekUtc(date);
    return { from, to: addDaysUtc(from, 6) };
  }
  const from = startOfWeekUtc(startOfMonthUtc(date));
  const lastWeek = startOfWeekUtc(endOfMonthUtc(date));
  return { from, to: addDaysUtc(lastWeek, 6) };
}

/** Ngày mà nút ‹ › nhảy tới. */
function step(view: CalendarView, date: Date, direction: 1 | -1) {
  if (view === "day") return addDaysUtc(date, direction);
  if (view === "week") return addDaysUtc(date, 7 * direction);
  const month = startOfMonthUtc(date);
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + direction, 1));
}

export function rangeLabel(view: CalendarView, date: Date) {
  if (view === "day") {
    return `${WEEKDAY_SHORT[date.getUTCDay()]}, ${formatDateUtc(date)}`;
  }
  if (view === "week") {
    const from = startOfWeekUtc(date);
    return `${formatDateUtc(from)} – ${formatDateUtc(addDaysUtc(from, 6))}`;
  }
  return formatMonthLabel(date);
}

export type CalendarSession = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  /** planned | taught | absent | makeup | rescheduled | teacher_changed */
  status: string;
  classId: string;
  classCode: string;
  className: string;
  courseName: string | null;
  teacherName: string | null;
  plannedContent?: string | null;
};

export const SESSION_STATUS_LABEL: Record<string, string> = {
  planned: "Dự kiến",
  taught: "Đã dạy",
  absent: "Vắng",
  makeup: "Học bù",
  rescheduled: "Đổi lịch",
  teacher_changed: "Đổi GV",
};

export function sessionStatusLabel(status: string) {
  return SESSION_STATUS_LABEL[status] ?? status;
}

type NavProps = {
  basePath: string;
  view: CalendarView;
  date: Date;
  /** Các tham số lọc hiện tại, được giữ lại khi đổi ngày / chế độ xem. */
  params: Record<string, string>;
  /** Bộ lọc nằm chung một dòng với thanh điều hướng cho gọn. */
  children?: React.ReactNode;
};

function href(basePath: string, params: Record<string, string>, patch: Record<string, string>) {
  const search = new URLSearchParams({ ...params, ...patch });
  return `${basePath}?${search.toString()}`;
}

/**
 * Trang lịch: tiêu đề + bộ lọc đứng yên, chỉ lưới bên dưới cuộn.
 * Phải là con trực tiếp của `main` (`flex flex-col`) để `flex-1` lấp đúng phần còn lại.
 */
export function CalendarPage({
  chrome,
  children,
}: {
  chrome?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {chrome ? <div className="shrink-0">{chrome}</div> : null}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", chrome && "mt-3")}>{children}</div>
    </div>
  );
}

export function CalendarNav({ basePath, view, date, params, children }: NavProps) {
  const navClass = buttonClass("ghost", "sm", "px-2");

  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-2">
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={href(basePath, params, { view, date: dateKey(step(view, date, -1)) })}
          className={navClass}
          aria-label="Kỳ trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={href(basePath, params, { view, date: dateKey(todayUtc()) })}
          className={buttonClass("ghost", "sm")}
        >
          Hôm nay
        </Link>
        <Link
          href={href(basePath, params, { view, date: dateKey(step(view, date, 1)) })}
          className={navClass}
          aria-label="Kỳ sau"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
        <span className="ml-2 text-sm font-medium whitespace-nowrap text-slate-700">
          {rangeLabel(view, date)}
        </span>
      </div>

      {children ? <div className="min-w-0 flex-1">{children}</div> : null}

      <div className="ml-auto flex shrink-0 rounded-lg border border-slate-200 p-0.5">
        {CALENDAR_VIEWS.map((item) => (
          <Link
            key={item}
            href={href(basePath, params, { view: item, date: dateKey(date) })}
            className={cn(
              "rounded-md px-3 py-1 text-sm transition",
              item === view
                ? "bg-brand-600 font-medium text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {VIEW_LABEL[item]}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Style chip trong chế độ xem Tháng — màu theo trạng thái buổi. */
const CHIP_STATUS_STYLE: Record<string, string> = {
  planned: "border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100",
  taught: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  absent: "border-red-200 bg-red-50 text-red-700 line-through hover:bg-red-100",
  makeup: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  rescheduled: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  teacher_changed: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
};

/** Chú thích hiện khi rê chuột lên thẻ buổi học. */
function sessionTitle(session: CalendarSession) {
  return [
    `${session.className} (${session.classCode}) · ${sessionStatusLabel(session.status)}`,
    `${session.startTime}–${session.endTime}`,
    session.teacherName ?? "Chưa phân công",
    session.courseName,
    session.plannedContent,
  ]
    .filter(Boolean)
    .join("\n");
}

function SessionChip({
  session,
  hrefBase,
  compact = false,
}: {
  session: CalendarSession;
  hrefBase: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={`${hrefBase}/${session.id}`}
      title={sessionTitle(session)}
      className={cn(
        "block w-full truncate rounded-md border px-2 py-1 text-left text-xs transition",
        CHIP_STATUS_STYLE[session.status] ?? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
      )}
    >
      <span className="font-mono">{session.startTime}</span>{" "}
      <span className="font-medium">{session.className}</span>
      {!compact && session.teacherName ? (
        <span className="opacity-70"> · {session.teacherName}</span>
      ) : null}
    </Link>
  );
}

/**
 * Màu thẻ đi theo lớp chứ không theo trạng thái: nhìn lưới là nhận ra ngay lớp nào
 * học ngày nào, giống Google Calendar. Trạng thái vẫn đọc được qua icon trên thẻ.
 */
const CLASS_TONES = [
  "border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100",
  "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
  "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
] as const;

/** Cùng một lớp luôn ra cùng một màu, kể cả khi đổi tuần hay đổi bộ lọc. */
function classTone(classId: string) {
  let sum = 0;
  for (let i = 0; i < classId.length; i++) sum = (sum + classId.charCodeAt(i)) % 997;
  return CLASS_TONES[sum % CLASS_TONES.length];
}

function sortSessions(sessions: CalendarSession[]) {
  return [...sessions].sort(
    (a, b) => a.startTime.localeCompare(b.startTime) || a.className.localeCompare(b.className),
  );
}

/**
 * Số "làn" của từng lớp trong một khung giờ: mỗi lớp một làn, giữ nguyên vị trí
 * xuyên suốt các ngày trong tuần để cùng một lớp luôn nằm cùng một hàng ngang.
 */
function classLanesForSlot(
  sessions: CalendarSession[],
  slot: { startTime: string; endTime: string },
  days: Date[],
) {
  const maxByClass = new Map<string, { className: string; classCode: string; count: number }>();
  for (const day of days) {
    const dayKey = dateKey(day);
    const counts = new Map<string, number>();
    for (const session of sessions) {
      if (session.startTime !== slot.startTime || session.endTime !== slot.endTime) continue;
      if (dateKey(session.date) !== dayKey) continue;
      counts.set(session.classId, (counts.get(session.classId) ?? 0) + 1);
      if (!maxByClass.has(session.classId)) {
        maxByClass.set(session.classId, {
          className: session.className,
          classCode: session.classCode,
          count: 1,
        });
      }
    }
    for (const [classId, count] of counts) {
      const row = maxByClass.get(classId);
      if (row && count > row.count) row.count = count;
    }
  }

  return [...maxByClass.entries()]
    .sort(
      (a, b) =>
        a[1].className.localeCompare(b[1].className, "vi") || a[1].classCode.localeCompare(b[1].classCode),
    )
    .flatMap(([classId, info]) => Array.from({ length: info.count }, (_, index) => ({ classId, index })));
}

function groupByDay(sessions: CalendarSession[]) {
  const map = new Map<string, CalendarSession[]>();
  for (const session of sessions) {
    const key = dateKey(session.date);
    const bucket = map.get(key);
    if (bucket) bucket.push(session);
    else map.set(key, [session]);
  }
  for (const [key, bucket] of map) map.set(key, sortSessions(bucket));
  return map;
}

/** Thẻ buổi trên lưới: tên lớp + giáo viên. Chi tiết còn trong tooltip / trang chi tiết. */
function SessionCard({
  session,
  hrefBase,
}: {
  session: CalendarSession;
  hrefBase: string;
}) {
  const cancelled = session.status === "absent";

  return (
    <Link
      href={`${hrefBase}/${session.id}`}
      title={sessionTitle(session)}
      className={cn(
        "block h-full w-full rounded-md border px-2 py-1 text-left transition",
        classTone(session.classId),
        cancelled && "opacity-50",
      )}
    >
      <p className="flex items-center gap-1">
        <span className={cn("min-w-0 flex-1 truncate text-xs font-semibold", cancelled && "line-through")}>
          {session.className}
        </span>
        {session.status === "taught" ? (
          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" aria-label="Đã dạy" />
        ) : cancelled ? (
          <Ban className="h-3 w-3 shrink-0 text-red-500" aria-label="Vắng" />
        ) : null}
      </p>
      <p className="flex items-center gap-1 text-[11px] leading-tight text-slate-600">
        <User className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="truncate">{session.teacherName ?? "Chưa phân công"}</span>
      </p>
    </Link>
  );
}

/**
 * Gom các buổi thành từng khung giờ. Mỗi khung giờ là một dòng của lưới — trung tâm
 * dạy theo ca cố định nên chỉ cần đúng những khung giờ có lớp, không cần trục 24 giờ.
 */
function timeSlots(sessions: CalendarSession[]) {
  const map = new Map<string, { startTime: string; endTime: string }>();
  for (const session of sessions) {
    const key = `${session.startTime}-${session.endTime}`;
    if (!map.has(key)) map.set(key, { startTime: session.startTime, endTime: session.endTime });
  }
  return [...map.values()].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      || timeToMinutes(a.endTime) - timeToMinutes(b.endTime),
  );
}

/** Lưới Giờ × Thứ kiểu Google Calendar. Dùng chung cho chế độ xem Ngày (1 cột) và Tuần (7 cột). */
function TimeGridView({
  days,
  sessions,
  hrefBase,
}: {
  days: Date[];
  sessions: CalendarSession[];
  hrefBase: string;
}) {
  const slots = timeSlots(sessions);
  const week = days.length > 1;

  if (slots.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-slate-500">Không có buổi học nào.</p>;
  }

  // Tra buổi theo "ngày + khung giờ" cho từng ô.
  const byCell = new Map<string, CalendarSession[]>();
  for (const session of sortSessions(sessions)) {
    const key = `${dateKey(session.date)}|${session.startTime}-${session.endTime}`;
    const bucket = byCell.get(key);
    if (bucket) bucket.push(session);
    else byCell.set(key, [session]);
  }

  return (
    <div
      className={cn(
        "grid gap-px bg-slate-200",
        week
          ? "min-w-[68rem] grid-cols-[6rem_repeat(7,minmax(0,1fr))]"
          : "grid-cols-[6rem_minmax(0,1fr)]",
      )}
    >
      {/* Hàng thứ/ngày dính khi cuộn các khung giờ. */}
      <div className="sticky top-0 z-[1] bg-slate-50 px-3 py-2.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Giờ
      </div>
      {days.map((day) => (
        <div key={dateKey(day)} className="sticky top-0 z-[1] bg-slate-50 px-3 py-2">
          <p className="text-sm font-semibold text-slate-800">
            {day.getUTCDay() === 0 ? "CN" : WEEKDAY_LABELS[day.getUTCDay()]}
          </p>
          <p className="text-xs font-medium text-slate-600">{formatDayMonth(day)}</p>
        </div>
      ))}

      {/* Mỗi khung giờ: các lớp cùng tên/cùng mã nằm cùng một hàng ngang xuyên tuần. */}
      {slots.map((slot, slotIndex) => {
        const lanes = classLanesForSlot(sessions, slot, days);
        const stripe = slotIndex % 2 === 0 ? "bg-white" : "bg-slate-100";
        return (
          <div key={`${slot.startTime}-${slot.endTime}`} className="contents">
            <div
              className={cn(stripe, "px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-600")}
              style={{ gridRow: `span ${Math.max(lanes.length, 1)}` }}
            >
              {slot.startTime} – {slot.endTime}
            </div>
            {lanes.map((lane) =>
              days.map((day) => {
                const key = dateKey(day);
                const items = byCell.get(`${key}|${slot.startTime}-${slot.endTime}`) ?? [];
                const matches = items.filter((session) => session.classId === lane.classId);
                const session = matches[lane.index];
                return (
                  <div key={`${lane.classId}-${lane.index}-${key}`} className={cn(stripe, "p-1.5")}>
                    {session ? (
                      <SessionCard session={session} hrefBase={hrefBase} />
                    ) : (
                      <div className="min-h-[2.75rem]" />
                    )}
                  </div>
                );
              }),
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  from,
  to,
  month,
  sessions,
  hrefBase,
}: {
  from: Date;
  to: Date;
  month: Date;
  sessions: CalendarSession[];
  hrefBase: string;
}) {
  const byDay = groupByDay(sessions);
  const days = eachDayUtc(from, to);
  const today = dateKey(todayUtc());
  const currentMonth = month.getUTCMonth();

  return (
    <div>
      <div className="sticky top-0 z-[1] hidden grid-cols-7 border-b border-slate-200 bg-white md:grid">
        {[1, 2, 3, 4, 5, 6, 0].map((weekday) => (
          <p key={weekday} className="px-2 py-2 text-center text-xs font-medium text-slate-500">
            {WEEKDAY_SHORT[weekday]}
          </p>
        ))}
      </div>
      <div className="grid gap-px bg-slate-200 md:grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day);
          const items = byDay.get(key) ?? [];
          const outside = day.getUTCMonth() !== currentMonth;
          return (
            <div
              key={key}
              className={cn("min-h-24 space-y-1 p-1.5", outside ? "bg-slate-50" : "bg-white")}
            >
              <p
                className={cn(
                  "text-xs",
                  key === today
                    ? "font-semibold text-brand-700"
                    : outside
                      ? "text-slate-300"
                      : "text-slate-500",
                )}
              >
                <span className="md:hidden">
                  {WEEKDAY_SHORT[day.getUTCDay()]} {day.getUTCDate()}/{day.getUTCMonth() + 1}
                </span>
                <span className="hidden md:inline">{day.getUTCDate()}</span>
              </p>
              {items.slice(0, 4).map((session) => (
                <SessionChip
                  key={session.id}
                  session={session}
                  hrefBase={hrefBase}
                  compact
                />
              ))}
              {items.length > 4 ? (
                <p className="text-[11px] text-slate-400">+{items.length - 4} buổi khác</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Khung lịch: lưới chiếm hết chiều cao. `toolbar` là một hàng bộ lọc dính trên cùng. */
export function CalendarBoard({
  view,
  date,
  sessions,
  hrefBase,
  toolbar,
  loading = false,
}: {
  view: CalendarView;
  date: Date;
  sessions: CalendarSession[];
  hrefBase: string;
  toolbar?: React.ReactNode;
  loading?: boolean;
}) {
  const { from, to } = calendarRange(view, date);

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {toolbar ? (
        <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2">{toolbar}</div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Đang tải…</p>
        ) : view === "month" ? (
          <MonthView
            from={from}
            to={to}
            month={date}
            sessions={sessions}
            hrefBase={hrefBase}
          />
        ) : (
          <TimeGridView
            days={view === "day" ? [date] : eachDayUtc(from, to)}
            sessions={sessions}
            hrefBase={hrefBase}
          />
        )}
      </div>
    </Card>
  );
}
