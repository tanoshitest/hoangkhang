'use client';

import { useState, useEffect } from 'react';
import { ClipboardCheck, Users, Percent, ListChecks } from 'lucide-react';

interface ClassOption {
  id: string;
  code: string;
  course?: { name: string };
}

interface AttendanceRow {
  student: { id: string; code: string; name: string };
  classCode: string;
  present: number;
  late: number;
  early_leave: number;
  excused_absent: number;
  unexcused_absent: number;
  total: number;
  attended: number;
  rate: number;
}

interface AttendanceReport {
  summary: {
    totalRecords: number;
    totalStudents: number;
    rate: number;
    byStatus: Record<string, number>;
  };
  rows: AttendanceRow[];
}

const STATUS_LABELS: Record<string, string> = {
  present: 'Có mặt',
  late: 'Đi muộn',
  early_leave: 'Về sớm',
  excused_absent: 'Vắng có phép',
  unexcused_absent: 'Vắng không phép',
};

export default function AttendanceReportPage() {
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setClasses(d.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchReport();
  }, [classId, from, to]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (classId) params.set('classId', classId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/attendance?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) setReport(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const rateColor = (rate: number) =>
    rate >= 90
      ? 'text-green-600'
      : rate >= 75
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="border border-slate-300 rounded-lg py-2 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Tất cả lớp</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}{c.course?.name ? ` — ${c.course.name}` : ''}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border border-slate-300 rounded-lg py-2 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border border-slate-300 rounded-lg py-2 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Percent className="h-5 w-5 text-brand-600" />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-slate-500">Tỷ lệ chuyên cần</div>
                  <div className="text-2xl font-bold text-slate-900">{report.summary.rate}%</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <ListChecks className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-slate-500">Lượt điểm danh</div>
                  <div className="text-2xl font-bold text-slate-900">{report.summary.totalRecords}</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-slate-500">Học viên</div>
                  <div className="text-2xl font-bold text-slate-900">{report.summary.totalStudents}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <span
                key={key}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
              >
                {label}: <span className="ml-1 font-semibold">{report.summary.byStatus[key] || 0}</span>
              </span>
            ))}
          </div>

          {/* Table */}
          <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Học viên</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Lớp</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Có mặt</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Đi muộn</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Về sớm</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Vắng phép</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Vắng KP</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Tổng buổi</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.rows.map((row) => (
                  <tr key={row.student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{row.student.name}</div>
                      <div className="text-xs text-slate-500">{row.student.code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.classCode}</td>
                    <td className="px-4 py-3 text-center text-sm text-green-700">{row.present}</td>
                    <td className="px-4 py-3 text-center text-sm text-yellow-700">{row.late}</td>
                    <td className="px-4 py-3 text-center text-sm text-orange-700">{row.early_leave}</td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600">{row.excused_absent}</td>
                    <td className="px-4 py-3 text-center text-sm text-red-700">{row.unexcused_absent}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-slate-900">{row.total}</td>
                    <td className={`px-4 py-3 text-center text-sm font-semibold ${rateColor(row.rate)}`}>
                      {row.rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.rows.length === 0 && (
              <div className="text-center py-12">
                <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có dữ liệu điểm danh</h3>
                <p className="mt-1 text-sm text-slate-500">Thử đổi bộ lọc lớp hoặc khoảng thời gian.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-6 text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Không tải được báo cáo.</p>
        </div>
      )}
    </div>
  );
}
