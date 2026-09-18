/**
 * Tiện ích ngày cho lịch dạy — port từ NZeducation.
 *
 * `Session.date` lưu ở nửa đêm UTC nên mọi phép tính dùng hàm `getUTC*` /
 * `Date.UTC` để không bị lệch ngày khi máy chạy ở múi giờ khác.
 */

/** Ngày ở nửa đêm UTC. */
export function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

const VN_TZ = "Asia/Ho_Chi_Minh";

/** Hôm nay theo lịch Việt Nam, quy về nửa đêm UTC — không phụ thuộc TZ máy chủ. */
export function todayUtc() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return utcDate(year, month - 1, day);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Đọc tham số `?date=YYYY-MM-DD`; sai định dạng thì lấy hôm nay. */
export function parseDateParam(raw?: string | null) {
  if (!raw || !DATE_RE.test(raw)) return todayUtc();
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? todayUtc() : date;
}

/** Đọc giá trị `<input type="date">`; rỗng hoặc sai định dạng thì trả `null`. */
export function parseDateInput(raw: string | null | undefined) {
  if (!raw || !DATE_RE.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDaysUtc(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Đầu tuần theo thói quen Việt Nam: Thứ 2. */
export function startOfWeekUtc(date: Date) {
  const weekday = date.getUTCDay(); // 0 = CN
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDaysUtc(date, offset);
}

export function startOfMonthUtc(date: Date) {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function endOfMonthUtc(date: Date) {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
}

/** Danh sách ngày liên tiếp từ `from` đến `to` (bao gồm cả hai đầu). */
export function eachDayUtc(from: Date, to: Date) {
  const days: Date[] = [];
  for (let d = from; d.getTime() <= to.getTime(); d = addDaysUtc(d, 1)) {
    days.push(d);
  }
  return days;
}

/** Khoá gom nhóm theo ngày — trùng định dạng với `<input type="date">`. */
export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isSameUtcDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

const VN_DATE = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** "10/08/2026" — đọc theo UTC để đúng với ngày đã lưu. */
export function formatDateUtc(date: Date | null | undefined) {
  if (!date) return "—";
  return VN_DATE.format(date);
}

/** "10/08" — dùng trong ô lịch cho gọn. */
export function formatDayMonth(date: Date) {
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(date: Date) {
  return `Tháng ${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
}
