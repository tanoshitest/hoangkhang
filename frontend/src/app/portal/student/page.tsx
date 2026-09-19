'use client';

import { useEffect, useState } from 'react';
import { API_URL, authHeaders } from '@/lib/utils';
import { Calendar, ClipboardCheck, CreditCard, FolderOpen, ExternalLink } from 'lucide-react';

const STATUS_SESSION: Record<string, string> = {
  planned: 'Chưa học', taught: 'Đã học', makeup: 'Học bù',
  absent: 'GV vắng', rescheduled: 'Dời lịch',
};
const STATUS_ATT: Record<string, string> = {
  present: 'Có mặt', late: 'Đi muộn', early_leave: 'Về sớm',
  excused_absent: 'Vắng có phép', unexcused_absent: 'Vắng không phép',
};
const ASSESS_TYPE: Record<string, string> = {
  quizizz: 'Quizizz', midterm: 'Giữa khóa', final: 'Cuối khóa', jlpt_real: 'JLPT thật',
};
const ITEM_TYPE: Record<string, string> = {
  deposit: 'Cọc', tuition: 'Học phí', material: 'Giáo trình PDF', makeup_hours: 'Giờ bù', other: 'Khác',
};
const RECV_STATUS: Record<string, string> = {
  pending: 'Chưa thu', partial: 'Thu một phần', paid: 'Đã thu đủ', overdue: 'Quá hạn', cancelled: 'Đã hủy',
};

const fmtMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

export default function StudentPortal() {
  const [tab, setTab] = useState<'schedule' | 'scores' | 'payments' | 'classes'>('schedule');
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = authHeaders();
    Promise.all([
      fetch(`${API_URL}/api/portal/student/classes`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/api/portal/student/schedule`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/api/portal/student/assessments`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/api/portal/student/payments`, { headers: h }).then(r => r.json()),
    ]).then(([c, s, a, p]) => {
      setClasses(c.data || []);
      setSessions(s.data || []);
      setAssessments(a.data || []);
      setReceivables(p.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const openReceipt = async (paymentId: string) => {
    const r = await fetch(`${API_URL}/api/portal/student/receipts/${paymentId}`, { headers: authHeaders() });
    if (!r.ok) return;
    const blob = await r.blob();
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const upcoming = sessions.filter(s => s.status === 'planned' && new Date(s.date) >= new Date(new Date().toDateString()));
  const past = sessions.filter(s => !upcoming.includes(s));

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-slate-500">Đang tải...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {([
          ['schedule', 'Lịch học', Calendar],
          ['scores', 'Điểm số', ClipboardCheck],
          ['payments', 'Học phí & phiếu thu', CreditCard],
          ['classes', 'Lớp & tài liệu', FolderOpen],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              tab === key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'schedule' && (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-4 py-2.5 text-[13px] font-semibold text-slate-900">Buổi sắp tới</h2>
            {upcoming.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Không có buổi học sắp tới</p>}
            <ul className="divide-y divide-slate-100">
              {upcoming.sort((a, b) => a.date.localeCompare(b.date)).map(s => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="w-24 shrink-0 font-medium text-slate-900">{fmtDate(s.date)}</div>
                  <div className="w-28 shrink-0 text-slate-600">{s.startTime}–{s.endTime}</div>
                  <div className="flex-1 font-medium text-brand-700">{s.classCode}</div>
                  {s.meetingLink && (
                    <a href={s.meetingLink} target="_blank" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                      <ExternalLink className="h-3 w-3" /> Link học
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-4 py-2.5 text-[13px] font-semibold text-slate-900">Lịch sử buổi học</h2>
            {past.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Chưa có buổi học nào</p>}
            <ul className="divide-y divide-slate-100">
              {past.map(s => (
                <li key={s.id} className="px-4 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-24 shrink-0 font-medium text-slate-900">{fmtDate(s.date)}</div>
                    <div className="w-28 shrink-0 text-slate-600">{s.startTime}–{s.endTime}</div>
                    <div className="font-medium text-brand-700">{s.classCode}</div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                      {STATUS_SESSION[s.status] || s.status}
                    </span>
                    {s.attendance && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        s.attendance.status === 'present' ? 'bg-emerald-50 text-emerald-700'
                        : s.attendance.status === 'late' || s.attendance.status === 'early_leave' ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                      }`}>
                        {STATUS_ATT[s.attendance.status] || s.attendance.status}
                        {s.attendance.countsAsAttended === false && ' (không tính buổi)'}
                      </span>
                    )}
                    {s.attendance?.makeupDirection === 'watch_video' && s.videoLink && (
                      <a href={s.videoLink} target="_blank" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                        <ExternalLink className="h-3 w-3" /> Video học bù
                      </a>
                    )}
                  </div>
                  {(s.actualContent || s.homework) && (
                    <div className="mt-1 pl-24 text-xs text-slate-500">
                      {s.actualContent && <div>Nội dung: {s.actualContent}</div>}
                      {s.homework && <div>Bài tập: {s.homework}</div>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === 'scores' && (
        <section className="rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-4 py-2.5 text-[13px] font-semibold text-slate-900">Kết quả đánh giá</h2>
          {assessments.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Chưa có điểm</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2">Ngày</th>
                <th className="px-4 py-2">Loại</th>
                <th className="px-4 py-2">Điểm</th>
                <th className="px-4 py-2">Kết quả</th>
                <th className="px-4 py-2">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assessments.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-2">{fmtDate(a.date)}</td>
                  <td className="px-4 py-2">{ASSESS_TYPE[a.type] || a.type}</td>
                  <td className="px-4 py-2 font-medium">
                    {a.score != null ? `${a.score}${a.maxScore ? `/${a.maxScore}` : ''}` : '—'}
                    {a.jlptResult && ` ${a.jlptResult}`}
                  </td>
                  <td className="px-4 py-2">
                    {a.passed === true && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Đạt</span>}
                    {a.passed === false && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">Chưa đạt</span>}
                    {a.passed == null && '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{a.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'payments' && (
        <div className="space-y-4">
          {receivables.length === 0 && (
            <section className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">Chưa có khoản học phí</section>
          )}
          {receivables.map(r => (
            <section key={r.id} className="rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                <span className="text-[13px] font-semibold text-slate-900">
                  {r.periodLabel || 'Khoản thu'} — {r.course?.name}
                </span>
                <span className="text-sm font-medium text-slate-600">{fmtMoney(r.totalAmount)}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  r.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : r.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                }`}>{RECV_STATUS[r.status] || r.status}</span>
              </div>
              {r.payments.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {r.payments.map((p: any) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                      <span className="font-mono text-[12px] font-medium text-brand-700">PT{String(p.receiptNo).padStart(4, '0')}</span>
                      <span className="text-slate-600">{ITEM_TYPE[p.itemType] || p.itemType}</span>
                      <span className="text-slate-500">{fmtDate(p.paymentDate)}</span>
                      <span className="ml-auto font-medium">{fmtMoney(p.amount)}</span>
                      <button
                        onClick={() => openReceipt(p.id)}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Phiếu thu
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {tab === 'classes' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.length === 0 && (
            <section className="col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">Chưa xếp lớp</section>
          )}
          {classes.map(c => (
            <section key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-900">{c.code}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {c.classType === 'one_on_one' ? '1 kèm 1' : 'Nhóm'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{c.course?.name}</p>
              <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                {c.shift && <div>Ca: {c.shift}</div>}
                {c.schedule && <div>Lịch: {c.schedule}</div>}
                {c.mainTeacher && <div>GV: {c.mainTeacher}{c.supportTeacher ? `, ${c.supportTeacher}` : ''}</div>}
              </div>
              <div className="mt-3 flex gap-3">
                {c.driveLink && (
                  <a href={c.driveLink} target="_blank" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Tài liệu Drive
                  </a>
                )}
                {c.videoLink && (
                  <a href={c.videoLink} target="_blank" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Video buổi học
                  </a>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
