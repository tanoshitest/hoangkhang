'use client';

import { useEffect, useState } from 'react';
import { API_URL, authHeaders } from '@/lib/utils';
import { School, Calendar, ClipboardCheck, Wallet, ChevronRight, ExternalLink } from 'lucide-react';

const STATUS_SESSION: Record<string, string> = {
  planned: 'Chưa dạy', taught: 'Đã dạy', makeup: 'Dạy bù',
  absent: 'Vắng', rescheduled: 'Dời lịch', teacher_changed: 'Đổi GV',
};
const ATT_OPTIONS: { v: string; label: string }[] = [
  { v: 'present', label: 'Có mặt' },
  { v: 'late', label: 'Đi muộn' },
  { v: 'early_leave', label: 'Về sớm' },
  { v: 'excused_absent', label: 'Vắng có phép' },
  { v: 'unexcused_absent', label: 'Vắng không phép' },
];
const ASSESS_TYPES = [
  { v: 'quizizz', label: 'Quizizz' },
  { v: 'midterm', label: 'Giữa khóa' },
  { v: 'final', label: 'Cuối khóa' },
  { v: 'jlpt_real', label: 'JLPT thật' },
];
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');
const fmtMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

interface AttRow { status: string; reportedBeforeHours?: string; makeupDirection?: string }

export default function TeacherPortal() {
  const [tab, setTab] = useState<'classes' | 'payroll'>('classes');
  const [classes, setClasses] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [attSession, setAttSession] = useState<any | null>(null);
  const [att, setAtt] = useState<Record<string, AttRow>>({});
  const [sessionEdit, setSessionEdit] = useState<any | null>(null);
  const [assessOpen, setAssessOpen] = useState(false);
  const [assess, setAssess] = useState<any>({ type: 'quizizz', date: new Date().toISOString().slice(0, 10) });
  const [msg, setMsg] = useState('');

  const loadClasses = () =>
    fetch(`${API_URL}/api/portal/teacher/classes`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setClasses(d.data || []));

  useEffect(() => {
    loadClasses();
    fetch(`${API_URL}/api/portal/teacher/payroll`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setPayroll(d.data || []));
  }, []);

  const openClass = async (c: any) => {
    setSelected(c);
    const [d, s] = await Promise.all([
      fetch(`${API_URL}/api/portal/teacher/classes/${c.id}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API_URL}/api/portal/teacher/classes/${c.id}/sessions`, { headers: authHeaders() }).then(r => r.json()),
    ]);
    setDetail(d);
    setSessions(s.data || []);
  };

  const openAttendance = (s: any) => {
    const init: Record<string, AttRow> = {};
    for (const m of detail?.classMembers || []) {
      const existing = s.attendances?.find((a: any) => a.studentId === m.student.id);
      init[m.student.id] = existing
        ? { status: existing.status, reportedBeforeHours: existing.reportedBeforeHours?.toString() ?? '', makeupDirection: existing.makeupDirection || '' }
        : { status: 'present' };
    }
    setAtt(init);
    setAttSession(s);
  };

  const saveAttendance = async () => {
    const attendances = Object.entries(att).map(([studentId, a]) => ({
      studentId,
      status: a.status,
      reportedBeforeHours: a.reportedBeforeHours ? Number(a.reportedBeforeHours) : undefined,
      makeupDirection: a.makeupDirection || undefined,
    }));
    const r = await fetch(`${API_URL}/api/portal/teacher/sessions/${attSession.id}/attendance`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendances }),
    });
    const d = await r.json();
    if (r.ok) {
      setMsg(`Đã lưu điểm danh ${d.saved} học viên${d.warningsCreated ? `, tạo ${d.warningsCreated} cảnh báo` : ''}`);
      setAttSession(null);
      openClass(selected);
    } else setMsg(d.error || 'Lỗi lưu điểm danh');
  };

  const saveSession = async () => {
    const r = await fetch(`${API_URL}/api/portal/teacher/sessions/${sessionEdit.id}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: sessionEdit.status,
        calculatedHours: sessionEdit.calculatedHours ? Number(sessionEdit.calculatedHours) : undefined,
        actualContent: sessionEdit.actualContent,
        homework: sessionEdit.homework,
      }),
    });
    if (r.ok) {
      setMsg('Đã lưu buổi học');
      setSessionEdit(null);
      openClass(selected);
    } else setMsg('Lỗi lưu buổi học');
  };

  const saveAssessment = async () => {
    const r = await fetch(`${API_URL}/api/portal/teacher/assessments`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...assess, classId: selected.id }),
    });
    const d = await r.json();
    if (r.ok) {
      setMsg('Đã nhập điểm');
      setAssessOpen(false);
      setAssess({ type: 'quizizz', date: new Date().toISOString().slice(0, 10) });
    } else setMsg(d.error || 'Lỗi nhập điểm');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {msg && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800" onClick={() => setMsg('')}>
          {msg}
        </div>
      )}
      <div className="flex gap-2">
        {([
          ['classes', 'Lớp phụ trách', School],
          ['payroll', 'Bảng lương', Wallet],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSelected(null); }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              tab === key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'classes' && !selected && (
        <div className="grid gap-3 sm:grid-cols-2">
          {classes.length === 0 && (
            <p className="col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              Chưa phụ trách lớp nào
            </p>
          )}
          {classes.map(c => (
            <button key={c.id} onClick={() => openClass(c)}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-shadow hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-900">{c.code}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {c.classType === 'one_on_one' ? '1 kèm 1' : 'Nhóm'} · {c.role === 'main' ? 'GV chính' : 'GV phụ'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{c.course?.name}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{c.activeStudents} HV · {c.totalSessions} buổi · {c.shift || c.schedule || ''}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === 'classes' && selected && detail && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setSelected(null)} className="text-sm text-brand-600 hover:underline">← Danh sách lớp</button>
            <h2 className="text-[15px] font-semibold text-slate-900">{selected.code} — {selected.course?.name}</h2>
            {selected.driveLink && (
              <a href={selected.driveLink} target="_blank" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                <ExternalLink className="h-3 w-3" /> Drive
              </a>
            )}
            <button onClick={() => setAssessOpen(true)}
              className="ml-auto rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
              + Nhập điểm
            </button>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white">
            <h3 className="border-b border-slate-100 px-4 py-2.5 text-[13px] font-semibold">Học viên ({detail.classMembers?.length || 0})</h3>
            <ul className="divide-y divide-slate-100">
              {(detail.classMembers || []).map((m: any) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="font-mono text-xs text-slate-400">{m.student.code}</span>
                  <span className="font-medium">{m.student.name}</span>
                  <span className="ml-auto text-xs text-slate-500">{m.student.phone}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white">
            <h3 className="border-b border-slate-100 px-4 py-2.5 text-[13px] font-semibold">Buổi học</h3>
            <ul className="divide-y divide-slate-100">
              {sessions.map(s => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                  <span className="w-24 font-medium">{fmtDate(s.date)}</span>
                  <span className="w-24 text-slate-600">{s.startTime}–{s.endTime}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    s.status === 'taught' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>{STATUS_SESSION[s.status] || s.status}</span>
                  {s.calculatedHours != null && <span className="text-xs text-slate-500">{s.calculatedHours}h</span>}
                  <span className="text-xs text-slate-400">{s.attendances?.length || 0} điểm danh</span>
                  <span className="ml-auto flex gap-2">
                    <button onClick={() => setSessionEdit({ ...s })}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                      Cập nhật
                    </button>
                    <button onClick={() => openAttendance(s)}
                      className="rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700">
                      Điểm danh
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === 'payroll' && (
        <div className="space-y-4">
          {payroll.length === 0 && (
            <section className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">Chưa có kỳ lương</section>
          )}
          {payroll.map(p => (
            <section key={p.id} className="rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                <span className="text-[13px] font-semibold">
                  Kỳ {fmtDate(p.periodStart)} → {fmtDate(p.periodEnd)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : p.status === 'confirmed' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>{p.status === 'paid' ? 'Đã trả' : p.status === 'confirmed' ? 'Đã chốt' : 'Nháp'}</span>
                <span className="ml-auto text-sm font-semibold">{fmtMoney(p.totalAmount)}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {p.items.map((i: any) => (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="w-24 text-slate-600">{fmtDate(i.date)}</span>
                    <span className="flex-1 text-slate-700">{i.description || i.type}</span>
                    <span className="font-medium">{fmtMoney(i.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Modal điểm danh */}
      {attSession && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setAttSession(null)}>
          <div className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold">Điểm danh — {fmtDate(attSession.date)} {attSession.startTime}</h3>
            <p className="mt-0.5 text-xs text-slate-500">Báo trước ≥24h & tối đa 2 lần/tháng = có phép (không tính buổi)</p>
            <div className="mt-4 space-y-3">
              {(detail.classMembers || []).map((m: any) => {
                const a = att[m.student.id] || { status: 'present' };
                const isAbsent = a.status.includes('absent');
                return (
                  <div key={m.student.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-36 text-sm font-medium">{m.student.name}</span>
                      <select
                        value={a.status}
                        onChange={e => setAtt({ ...att, [m.student.id]: { ...a, status: e.target.value } })}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      >
                        {ATT_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                      </select>
                      {isAbsent && (
                        <>
                          <label className="flex items-center gap-1 text-xs text-slate-600">
                            Báo trước
                            <input
                              type="number" min={0} step={1} placeholder="giờ"
                              value={a.reportedBeforeHours || ''}
                              onChange={e => setAtt({ ...att, [m.student.id]: { ...a, reportedBeforeHours: e.target.value } })}
                              className="w-16 rounded-md border border-slate-200 px-1.5 py-1"
                            />
                            h
                          </label>
                          <select
                            value={a.makeupDirection || ''}
                            onChange={e => setAtt({ ...att, [m.student.id]: { ...a, makeupDirection: e.target.value } })}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                          >
                            <option value="">Hướng học bù…</option>
                            <option value="watch_video">Xem video</option>
                            <option value="private_session">Học bù riêng</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAttSession(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">Hủy</button>
              <button onClick={saveAttendance} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                Lưu điểm danh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cập nhật buổi */}
      {sessionEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setSessionEdit(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold">Buổi {fmtDate(sessionEdit.date)} {sessionEdit.startTime}</h3>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block">
                <span className="text-xs text-slate-500">Trạng thái</span>
                <select
                  value={sessionEdit.status}
                  onChange={e => setSessionEdit({ ...sessionEdit, status: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5"
                >
                  {Object.entries(STATUS_SESSION).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Giờ dạy thực tế</span>
                <input
                  type="number" step={0.5} min={0}
                  value={sessionEdit.calculatedHours ?? ''}
                  onChange={e => setSessionEdit({ ...sessionEdit, calculatedHours: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Nội dung đã dạy</span>
                <textarea
                  value={sessionEdit.actualContent || ''}
                  onChange={e => setSessionEdit({ ...sessionEdit, actualContent: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5" rows={2}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Bài tập về nhà</span>
                <textarea
                  value={sessionEdit.homework || ''}
                  onChange={e => setSessionEdit({ ...sessionEdit, homework: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5" rows={2}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSessionEdit(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">Hủy</button>
              <button onClick={saveSession} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nhập điểm */}
      {assessOpen && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setAssessOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold">Nhập điểm — {selected.code}</h3>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block">
                <span className="text-xs text-slate-500">Học viên</span>
                <select
                  value={assess.studentId || ''}
                  onChange={e => setAssess({ ...assess, studentId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5"
                >
                  <option value="">— chọn —</option>
                  {(detail.classMembers || []).map((m: any) => (
                    <option key={m.student.id} value={m.student.id}>{m.student.name} ({m.student.code})</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-500">Loại</span>
                  <select
                    value={assess.type}
                    onChange={e => setAssess({ ...assess, type: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5"
                  >
                    {ASSESS_TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500">Ngày</span>
                  <input type="date" value={assess.date}
                    onChange={e => setAssess({ ...assess, date: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5" />
                </label>
              </div>
              {assess.type === 'jlpt_real' ? (
                <label className="block">
                  <span className="text-xs text-slate-500">Kết quả JLPT</span>
                  <select
                    value={assess.jlptResult || ''}
                    onChange={e => setAssess({ ...assess, jlptResult: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5"
                  >
                    <option value="">—</option>
                    <option value="Đậu">Đậu</option>
                    <option value="Rớt">Rớt</option>
                  </select>
                </label>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-slate-500">Điểm</span>
                    <input type="number" value={assess.score ?? ''}
                      onChange={e => setAssess({ ...assess, score: e.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">Điểm tối đa</span>
                    <input type="number" value={assess.maxScore ?? ''}
                      onChange={e => setAssess({ ...assess, maxScore: e.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5" />
                  </label>
                </div>
              )}
              <label className="block">
                <span className="text-xs text-slate-500">Ghi chú</span>
                <input value={assess.notes || ''}
                  onChange={e => setAssess({ ...assess, notes: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAssessOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">Hủy</button>
              <button onClick={saveAssessment} disabled={!assess.studentId}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
                Lưu điểm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
