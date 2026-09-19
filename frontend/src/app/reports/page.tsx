'use client';

import { useState, useEffect } from 'react';
import { Download, BarChart3 } from 'lucide-react';
import { formatVND, formatDate } from '../finance/page';

type Tab = 'sales' | 'students' | 'classes' | 'academic' | 'finance' | 'teachers' | 'weekly' | 'staff-cost';

const TABS: { id: Tab; name: string }[] = [
  { id: 'sales', name: 'Tuyển sinh' },
  { id: 'students', name: 'Học viên' },
  { id: 'classes', name: 'Lớp học' },
  { id: 'academic', name: 'Đào tạo' },
  { id: 'finance', name: 'Tài chính' },
  { id: 'teachers', name: 'Giáo viên' },
  { id: 'weekly', name: 'Kỳ tuần' },
  { id: 'staff-cost', name: 'Chi phí nhân sự' },
];

const STATUS_LABELS: Record<string, string> = {
  new: 'Mới', assigned: 'Đã phân công', contacted: 'Đã liên hệ', consulting: 'Đang tư vấn',
  test_pending: 'Chờ kiểm tra', trial: 'Học thử', decision_pending: 'Chờ quyết định',
  registered: 'Đã đăng ký', not_registered: 'Không đăng ký',
  waiting_class: 'Chờ lớp', studying: 'Đang học', reserved: 'Bảo lưu',
  transferred: 'Chuyển', dropped: 'Nghỉ', completed: 'Hoàn thành',
  planned: 'Dự kiến', recruiting: 'Đang tuyển', full: 'Đủ sĩ số', paused: 'Tạm dừng', finished: 'Kết thúc',
  present: 'Có mặt', late: 'Đi muộn', left_early: 'Về sớm', absent_excused: 'Vắng phép', absent_unexcused: 'Vắng KP',
  processing: 'Đang xử lý', resolved: 'Đã giải quyết', closed: 'Đóng',
};

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ from: '', to: '' });

  useEffect(() => {
    fetchReport();
  }, [tab]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (range.from) params.set(tab === 'weekly' ? 'week' : 'from', range.from);
      if (range.to && tab !== 'weekly') params.set('to', range.to);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/${tab}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async (type: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/export/${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const hasRange = tab === 'sales' || tab === 'finance' || tab === 'teachers' || tab === 'weekly' || tab === 'staff-cost';

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        {hasRange && (
          <div className="mb-4 flex items-center justify-end gap-3">
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
            <span className="text-slate-500 text-sm">→</span>
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={fetchReport} className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm">Lọc</button>
          </div>
        )}

        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => { setData(null); setLoading(true); setTab(t.id); }}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  tab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                {t.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <BarChart3 className="h-6 w-6 animate-pulse text-slate-400" />
            </div>
          ) : !data ? (
            <p className="text-center text-slate-500 py-12">Không có dữ liệu</p>
          ) : (
            <>
              {tab === 'sales' && <SalesReport data={data} onExport={() => exportCsv('leads')} />}
              {tab === 'students' && <StudentsReport data={data} onExport={() => exportCsv('students')} />}
              {tab === 'classes' && <ClassesReport data={data} />}
              {tab === 'academic' && <AcademicReport data={data} />}
              {tab === 'finance' && <FinanceReport data={data} onExport={() => exportCsv('payments')} />}
              {tab === 'teachers' && <TeachersReport data={data} />}
              {tab === 'weekly' && <WeeklyReport data={data} />}
              {tab === 'staff-cost' && <StaffCostReport data={data} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, sub }: { title: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-xl font-bold tracking-tight text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-slate-600 w-36 truncate">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-4">
        <div className="bg-brand-500 h-4 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-slate-900 w-16 text-right">{value} ({pct}%)</span>
    </div>
  );
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
      <Download className="h-4 w-4 mr-1" /> Export CSV
    </button>
  );
}

function SalesReport({ data, onExport }: { data: any; onExport: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportButton onClick={onExport} /></div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Card title="Tổng lead" value={data.total} />
        <Card title="Tỷ lệ liên hệ" value={`${data.contactRate}%`} sub={`${data.contacted}/${data.total} đã liên hệ`} />
        <Card title="Học thử" value={data.trialed} />
        <Card title="Tỷ lệ đăng ký" value={`${data.conversionRate}%`} sub={`${data.converted} chuyển đổi`} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">Theo nguồn</h3>
          {Object.entries((data.bySource || {}) as Record<string, number>).map(([k, v]) => (
            <BarRow key={k} label={k} value={v} total={data.total} />
          ))}
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">Theo trạng thái</h3>
          {Object.entries((data.byStatus || {}) as Record<string, number>).map(([k, v]) => (
            <BarRow key={k} label={STATUS_LABELS[k] || k} value={v} total={data.total} />
          ))}
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">Theo người phụ trách</h3>
          {Object.entries((data.byAssignee || {}) as Record<string, { total: number; converted: number }>).map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 text-sm">
              <span className="text-slate-600">{k}</span>
              <span className="font-medium">{v.total} lead • {v.converted} đăng ký</span>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">Lý do không đăng ký</h3>
          {Object.keys(data.notRegisteredReasons || {}).length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có dữ liệu</p>
          ) : (
            Object.entries((data.notRegisteredReasons || {}) as Record<string, number>).map(([k, v]) => (
              <BarRow key={k} label={k} value={v} total={data.total} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StudentsReport({ data, onExport }: { data: any; onExport: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportButton onClick={onExport} /></div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
        <Card title="Tổng học viên" value={data.total} />
        <Card title="Đang học" value={data.byStatus?.studying || 0} />
        <Card title="Đăng ký tiếp" value={data.reRegistered} sub="Học viên có >1 enrollment" />
      </div>
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
        <h3 className="text-md font-medium text-slate-900 mb-3">Theo trạng thái</h3>
        {Object.entries((data.byStatus || {}) as Record<string, number>).map(([k, v]) => (
          <BarRow key={k} label={STATUS_LABELS[k] || k} value={v} total={data.total} />
        ))}
      </div>
    </div>
  );
}

function ClassesReport({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Card title="Tổng lớp" value={data.total} />
        <Card title="Đang tuyển" value={data.byStatus?.recruiting || 0} />
        <Card title="Đang học" value={data.byStatus?.studying || 0} />
        <Card title="Kết thúc" value={data.byStatus?.finished || 0} />
      </div>
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Lớp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Khóa</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Sĩ số</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Lấp đầy</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Tiến độ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(data.classes || []).map((c: any) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.code}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{c.course}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{STATUS_LABELS[c.status] || c.status}</td>
                <td className="px-4 py-3 text-sm text-slate-900">{c.studyingStudents}/{c.maxStudents || '∞'}</td>
                <td className="px-4 py-3 text-sm text-slate-900">{c.fillRate}%</td>
                <td className="px-4 py-3 text-sm text-slate-900">{c.taughtSessions}/{c.totalSessions} buổi ({c.progress}%)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AcademicReport({ data }: { data: any }) {
  const attendance = data.attendance || { rate: 0, total: 0, byStatus: {} };
  const warnings = data.warnings || { byStatus: {}, byType: {} };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
        <Card title="Tỷ lệ chuyên cần" value={`${attendance.rate}%`} sub={`${attendance.total} lượt điểm danh`} />
        <Card title="Điểm trung bình" value={data.avgScore !== null ? `${data.avgScore}/10` : '-'} sub={`${data.assessmentCount} bài đánh giá`} />
        <Card title="Cảnh báo mở" value={warnings.byStatus.new || 0} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">Điểm danh theo trạng thái</h3>
          {Object.entries(attendance.byStatus as Record<string, number>).map(([k, v]) => (
            <BarRow key={k} label={STATUS_LABELS[k] || k} value={v} total={attendance.total} />
          ))}
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">Cảnh báo theo loại</h3>
          {Object.entries(warnings.byType as Record<string, number>).map(([k, v]) => (
            <BarRow key={k} label={k} value={v} total={Object.values(warnings.byType).reduce((a: number, b: any) => a + b, 0)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FinanceReport({ data, onExport }: { data: any; onExport: () => void }) {
  const days = Object.entries((data.byDay || {}) as Record<string, number>).sort();
  const max = Math.max(...days.map(([, v]) => v), 1);
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportButton onClick={onExport} /></div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
        <Card title="Doanh thu kỳ này" value={formatVND(data.totalCollected)} sub={`${data.from} → ${data.to}`} />
        <Card title="Số giao dịch" value={data.paymentCount} />
        <Card title="TB/giao dịch" value={data.paymentCount ? formatVND(Math.round(data.totalCollected / data.paymentCount)) : '-'} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">Doanh thu theo ngày</h3>
          {days.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có giao dịch</p>
          ) : (
            <div className="space-y-1">
              {days.map(([day, amount]) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-20">{formatDate(day)}</span>
                  <div className="flex-1 bg-slate-100 rounded h-4">
                    <div className="bg-green-500 h-4 rounded" style={{ width: `${(amount / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-24 text-right">{formatVND(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">Theo phương thức</h3>
          {Object.entries((data.byMethod || {}) as Record<string, number>).map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 text-sm">
              <span className="text-slate-600 capitalize">{k.replace('_', ' ')}</span>
              <span className="font-medium">{formatVND(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeeklyReport({ data }: { data: any }) {
  const SESSION_LABELS: Record<string, string> = {
    planned: 'Dự kiến', taught: 'Đã dạy', absent: 'GV vắng', makeup: 'Dạy bù',
    rescheduled: 'Dời lịch', teacher_changed: 'Đổi GV',
  };
  const s = data.sessions || {};
  const a = data.attendance || {};
  const attTotal = a.total || 0;
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Tuần {formatDate(data.weekStart)} → {formatDate(data.weekEnd)}</p>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Card title="Buổi học trong tuần" value={s.total || 0} sub={`${s.taughtHours || 0} giờ • ${s.teachers || 0} GV`} />
        <Card title="Chuyên cần" value={a.rate !== null && a.rate !== undefined ? `${a.rate}%` : '-'} sub={`${attTotal} lượt điểm danh`} />
        <Card title="Doanh thu tuần" value={formatVND(data.revenue?.collected || 0)} sub={`${data.revenue?.paymentCount || 0} giao dịch`} />
        <Card title="Lương GV tuần" value={formatVND(data.payroll?.totalAmount || 0)} sub={`${data.payroll?.periods || 0} kỳ • ${data.payroll?.totalHours || 0}h`} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">Buổi học theo trạng thái</h3>
          {Object.entries((s.byStatus || {}) as Record<string, number>).map(([k, v]) => (
            <BarRow key={k} label={SESSION_LABELS[k] || STATUS_LABELS[k] || k} value={v} total={s.total || 0} />
          ))}
          {!(s.total > 0) && <p className="text-sm text-slate-500">Chưa có buổi nào</p>}
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">Điểm danh trong tuần</h3>
          {Object.entries((a.byStatus || {}) as Record<string, number>).map(([k, v]) => (
            <BarRow key={k} label={STATUS_LABELS[k] || k} value={v} total={attTotal} />
          ))}
          {!(attTotal > 0) && <p className="text-sm text-slate-500">Chưa điểm danh</p>}
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">Pipeline tuần</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-600">Lead mới</span><span className="font-medium">{data.pipeline?.newLeads || 0}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Ghi danh mới</span><span className="font-medium">{data.pipeline?.newEnrollments || 0}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Cảnh báo học tập</span><span className="font-medium">{data.pipeline?.warnings || 0}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffCostReport({ data }: { data: any }) {
  const summary = data.summary || {};
  const months = Object.entries((data.byMonth || {}) as Record<string, { payroll: number; hours: number; commission: number }>).sort();
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">{formatDate(data.from)} → {formatDate(data.to)} — chỉ tính kỳ lương đã xác nhận/trả + HH đã chi</p>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Card title="Lương GV" value={formatVND(summary.totalPayroll || 0)} />
        <Card title="Hoa hồng sale" value={formatVND(summary.totalCommission || 0)} />
        <Card title="Tổng chi phí NS" value={formatVND(summary.totalCost || 0)} />
        <Card title="Tỷ trọng / doanh thu" value={summary.costRatio !== null && summary.costRatio !== undefined ? `${summary.costRatio}%` : '-'} sub={`DT ${formatVND(summary.revenue || 0)}`} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
          <h3 className="text-md font-medium text-slate-900 px-6 pt-5 pb-3">Lương GV theo người</h3>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Giáo viên</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Kỳ</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Giờ</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Tổng</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Đã trả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(data.byTeacher || []).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Chưa có kỳ lương</td></tr>
              ) : (
                (data.byTeacher || []).map((t: any) => (
                  <tr key={t.teacher.id}>
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{t.teacher.name} <span className="text-xs text-slate-500">({t.teacher.code})</span></td>
                    <td className="px-4 py-2.5 text-sm text-slate-900">{t.periods}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-900">{t.totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-2.5 text-sm text-slate-900">{formatVND(t.totalAmount)}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">{formatVND(t.paid)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
            <h3 className="text-md font-medium text-slate-900 mb-3">Theo tháng</h3>
            {months.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có dữ liệu</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead><tr className="text-xs text-slate-500">
                  <th className="text-left py-1">Tháng</th><th className="text-right">Lương GV</th><th className="text-right">Giờ</th><th className="text-right">Hoa hồng</th>
                </tr></thead>
                <tbody>
                  {months.map(([m, v]) => (
                    <tr key={m} className="border-t border-slate-100">
                      <td className="py-1.5 text-slate-700">{m}</td>
                      <td className="text-right text-slate-900">{formatVND(v.payroll)}</td>
                      <td className="text-right text-slate-600">{v.hours.toFixed(1)}h</td>
                      <td className="text-right text-slate-900">{formatVND(v.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
            <h3 className="text-md font-medium text-slate-900 mb-3">Hoa hồng đã chi</h3>
            {(data.bySale || []).length === 0 ? (
              <p className="text-sm text-slate-500">Chưa chi hoa hồng</p>
            ) : (
              (data.bySale || []).map((s: any) => (
                <div key={s.name} className="flex justify-between py-1.5 text-sm">
                  <span className="text-slate-600">{s.name}</span>
                  <span className="font-medium">{formatVND(s.amount)} <span className="text-xs text-slate-400">({s.count} khoản)</span></span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeachersReport({ data }: { data: any }) {
  const PAYROLL_STATUS: Record<string, string> = { draft: 'Nháp', confirmed: 'Đã xác nhận', paid: 'Đã trả', none: 'Chưa đối soát' };
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Giáo viên</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Số buổi</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Tổng giờ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Dạy bù</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Tiền dự kiến</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Đối soát</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(data.data || []).length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Chưa có dữ liệu giờ dạy</td></tr>
            ) : (
              (data.data || []).map((t: any) => (
                <tr key={t.teacher.id}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.teacher.name} <span className="text-xs text-slate-500">({t.teacher.code})</span></td>
                  <td className="px-4 py-3 text-sm text-slate-900">{t.sessions}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{t.totalHours.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{t.makeup}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{t.estimatedPay > 0 ? formatVND(t.estimatedPay) : '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{PAYROLL_STATUS[t.payrollStatus] || t.payrollStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
