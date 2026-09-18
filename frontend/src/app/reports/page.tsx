'use client';

import { useState, useEffect } from 'react';
import { Download, BarChart3 } from 'lucide-react';
import { formatVND, formatDate } from '../finance/page';

type Tab = 'sales' | 'students' | 'classes' | 'academic' | 'finance' | 'teachers';

const TABS: { id: Tab; name: string }[] = [
  { id: 'sales', name: 'Tuyển sinh' },
  { id: 'students', name: 'Học viên' },
  { id: 'classes', name: 'Lớp học' },
  { id: 'academic', name: 'Đào tạo' },
  { id: 'finance', name: 'Tài chính' },
  { id: 'teachers', name: 'Giáo viên' },
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
      if (range.from) params.set('from', range.from);
      if (range.to) params.set('to', range.to);
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

  const hasRange = tab === 'sales' || tab === 'finance' || tab === 'teachers';

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
