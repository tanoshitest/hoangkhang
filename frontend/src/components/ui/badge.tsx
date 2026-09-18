import * as React from "react";

import { cn } from "@/lib/utils";

export type Tone = "brand" | "green" | "amber" | "red" | "slate" | "orange" | "purple";

const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  purple: "bg-purple-50 text-purple-700 ring-purple-200",
};

export function Badge({
  className,
  tone = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Map status → nhãn + màu cho các enum nghiệp vụ của CRM */
export const STATUS_TONE: Record<string, { label: string; tone: Tone }> = {
  // Lead status
  new: { label: "Mới", tone: "brand" },
  assigned: { label: "Đã phân công", tone: "purple" },
  contacted: { label: "Đã liên hệ", tone: "amber" },
  consulting: { label: "Đang tư vấn", tone: "amber" },
  test_pending: { label: "Chờ test", tone: "purple" },
  trial: { label: "Học thử", tone: "purple" },
  decision_pending: { label: "Chờ quyết định", tone: "orange" },
  registered: { label: "Đã đăng ký", tone: "green" },
  not_registered: { label: "Không đăng ký", tone: "red" },
  // Student status
  waiting_class: { label: "Chờ xếp lớp", tone: "amber" },
  studying: { label: "Đang học", tone: "green" },
  reserved: { label: "Bảo lưu", tone: "orange" },
  transferred: { label: "Đã chuyển lớp", tone: "brand" },
  dropped: { label: "Nghỉ học", tone: "red" },
  completed: { label: "Hoàn thành", tone: "green" },
  // Class status
  planned: { label: "Dự kiến", tone: "slate" },
  recruiting: { label: "Tuyển sinh", tone: "brand" },
  full: { label: "Đủ sĩ số", tone: "purple" },
  paused: { label: "Tạm dừng", tone: "amber" },
  finished: { label: "Đã kết thúc", tone: "slate" },
  // Session status
  taught: { label: "Đã dạy", tone: "green" },
  absent: { label: "Vắng", tone: "red" },
  makeup: { label: "Học bù", tone: "amber" },
  rescheduled: { label: "Đổi lịch", tone: "orange" },
  teacher_changed: { label: "Đổi GV", tone: "orange" },
  // Attendance
  present: { label: "Có mặt", tone: "green" },
  late: { label: "Đi muộn", tone: "amber" },
  early_leave: { label: "Về sớm", tone: "orange" },
  excused_absent: { label: "Vắng có phép", tone: "amber" },
  unexcused_absent: { label: "Vắng không phép", tone: "red" },
  // Finance
  pending: { label: "Chờ xử lý", tone: "amber" },
  partial: { label: "Trả một phần", tone: "brand" },
  paid: { label: "Đã thanh toán", tone: "green" },
  overdue: { label: "Quá hạn", tone: "red" },
  cancelled: { label: "Đã hủy", tone: "slate" },
  confirmed: { label: "Đã xác nhận", tone: "green" },
  approved: { label: "Đã duyệt", tone: "green" },
  rejected: { label: "Từ chối", tone: "red" },
  // Enrollment
  enrolled: { label: "Đã ghi danh", tone: "brand" },
  // Warning
  processing: { label: "Đang xử lý", tone: "amber" },
  resolved: { label: "Đã giải quyết", tone: "green" },
  closed: { label: "Đã đóng", tone: "slate" },
  contacted_w: { label: "Đã liên hệ", tone: "amber" },
  // Follow-up
  scheduled: { label: "Đã lên lịch", tone: "brand" },
  done: { label: "Hoàn thành", tone: "green" },
  // Payroll
  draft: { label: "Nháp", tone: "slate" },
};

export function StatusBadge({ value }: { value: string }) {
  const cfg = STATUS_TONE[value];
  if (!cfg) return <Badge>{value}</Badge>;
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}
