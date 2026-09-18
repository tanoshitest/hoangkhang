'use client';

import { useState, useEffect } from 'react';
import { GraduationCap, ClipboardList, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';

interface ClassOption {
  id: string;
  code: string;
  course?: { name: string };
}

interface ResultRow {
  student: { id: string; code: string; name: string; status: string };
  classes: string[];
  avgScore: number | null;
  assessmentCount: number;
  scoreByType: Record<string, number>;
  attendanceTotal: number;
  attendanceRate: number | null;
  openWarnings: number;
}

const TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  midterm: 'Giữa kỳ',
  final: 'Cuối kỳ',
  jlpt_mock: 'JLPT thử',
  progress: 'Đánh giá buổi học',
};

export default function TrainingResultsPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState('');
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
  }, [classId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (classId) params.set('classId', classId);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/training-results?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) setRows((await res.json()).data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const scored = rows.filter((r) => r.avgScore !== null);
  const overallAvg =
    scored.length > 0
      ? Math.round((scored.reduce((s, r) => s + (r.avgScore || 0), 0) / scored.length) * 10) / 10
      : null;
  const totalAssessments = rows.reduce((s, r) => s + r.assessmentCount, 0);
  const warningCount = rows.filter((r) => r.openWarnings > 0).length;

  const scoreColor = (score: number | null) =>
    score === null
      ? 'text-slate-400'
      : score >= 8
        ? 'text-green-600'
        : score >= 6.5
          ? 'text-yellow-600'
          : 'text-red-600';

  return (
    <div className="max-w-7xl mx-auto">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-brand-600" />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-slate-500">Điểm TB chung</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {overallAvg !== null ? overallAvg : '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-slate-500">Bài đánh giá</div>
                  <div className="text-2xl font-bold text-slate-900">{totalAssessments}</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-slate-500">Học viên</div>
                  <div className="text-2xl font-bold text-slate-900">{rows.length}</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-slate-500">Đang cảnh báo</div>
                  <div className="text-2xl font-bold text-slate-900">{warningCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <Card className="mt-4 overflow-hidden">
            <CardHeader className="flex-col items-start gap-3">
              <div className="flex w-full items-start justify-between gap-4">
                <div>
                  <CardTitle>Kết quả theo học viên ({rows.length})</CardTitle>
                  <CardDescription>Điểm trung bình, chuyên cần và cảnh báo của từng học viên.</CardDescription>
                </div>
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
              </div>
            </CardHeader>
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">#</TH>
                  <TH>Học viên</TH>
                  <TH>Lớp</TH>
                  <TH className="text-center">Điểm TB</TH>
                  <TH>Điểm theo loại</TH>
                  <TH className="text-center">Số bài</TH>
                  <TH className="text-center">Chuyên cần</TH>
                  <TH className="text-center">Cảnh báo</TH>
                </TR>
              </THead>
              <TBody>
                {rows.length === 0 ? (
                  <EmptyRow colSpan={8}>Chưa có dữ liệu — thử đổi bộ lọc lớp.</EmptyRow>
                ) : (
                  rows.map((row, index) => (
                    <TR key={row.student.id}>
                      <TD className="text-xs text-slate-400">{index + 1}</TD>
                      <TD>
                        <div className="font-medium text-slate-900">{row.student.name}</div>
                        <div className="font-mono text-xs text-slate-500">{row.student.code}</div>
                      </TD>
                      <TD className="whitespace-nowrap">
                        {row.classes.length > 0 ? row.classes.join(', ') : '—'}
                      </TD>
                      <TD className={`text-center font-semibold ${scoreColor(row.avgScore)}`}>
                        {row.avgScore !== null ? row.avgScore : '—'}
                      </TD>
                      <TD>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(row.scoreByType).map(([type, score]) => (
                            <span
                              key={type}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700"
                            >
                              {TYPE_LABELS[type] || type}: {score}
                            </span>
                          ))}
                          {Object.keys(row.scoreByType).length === 0 && (
                            <span className="text-xs text-slate-400">Chưa có</span>
                          )}
                        </div>
                      </TD>
                      <TD className="text-center">{row.assessmentCount}</TD>
                      <TD className="text-center">
                        {row.attendanceRate !== null ? `${row.attendanceRate}%` : '—'}
                      </TD>
                      <TD className="text-center">
                        {row.openWarnings > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {row.openWarnings}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">0</span>
                        )}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
