'use client';

import { useState, useEffect } from 'react';
import { Users, Percent, ListChecks } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';

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
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Card className="mt-4 overflow-hidden">
            <CardHeader className="flex-col items-start gap-3">
              <div>
                <CardTitle>Chuyên cần theo học viên ({report.rows.length})</CardTitle>
                <CardDescription>Tổng hợp lượt điểm danh theo trạng thái của từng học viên.</CardDescription>
              </div>
              <div className="flex w-full flex-wrap gap-3">
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
            </CardHeader>
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">#</TH>
                  <TH>Học viên</TH>
                  <TH>Lớp</TH>
                  <TH className="text-center">Có mặt</TH>
                  <TH className="text-center">Đi muộn</TH>
                  <TH className="text-center">Về sớm</TH>
                  <TH className="text-center">Vắng phép</TH>
                  <TH className="text-center">Vắng KP</TH>
                  <TH className="text-center">Tổng buổi</TH>
                  <TH className="text-center">Tỷ lệ</TH>
                </TR>
              </THead>
              <TBody>
                {report.rows.length === 0 ? (
                  <EmptyRow colSpan={10}>Chưa có dữ liệu điểm danh — thử đổi bộ lọc lớp hoặc khoảng thời gian.</EmptyRow>
                ) : (
                  report.rows.map((row, index) => (
                    <TR key={row.student.id}>
                      <TD className="text-xs text-slate-400">{index + 1}</TD>
                      <TD>
                        <div className="font-medium text-slate-900">{row.student.name}</div>
                        <div className="font-mono text-xs text-slate-500">{row.student.code}</div>
                      </TD>
                      <TD className="whitespace-nowrap">{row.classCode}</TD>
                      <TD className="text-center text-green-700">{row.present}</TD>
                      <TD className="text-center text-yellow-700">{row.late}</TD>
                      <TD className="text-center text-orange-700">{row.early_leave}</TD>
                      <TD className="text-center text-slate-600">{row.excused_absent}</TD>
                      <TD className="text-center text-red-700">{row.unexcused_absent}</TD>
                      <TD className="text-center font-medium text-slate-900">{row.total}</TD>
                      <TD className={`text-center font-semibold ${rateColor(row.rate)}`}>
                        {row.rate}%
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>
        </>
      ) : (
        <div className="mt-6 text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Không tải được báo cáo.</p>
        </div>
      )}
    </div>
  );
}
