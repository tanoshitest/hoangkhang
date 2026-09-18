'use client';

import { useState, useEffect } from 'react';
import { GraduationCap, ClipboardList, AlertTriangle, TrendingUp } from 'lucide-react';

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
      <div className="mb-4 flex justify-end">
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
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
          <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Học viên</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Lớp</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Điểm TB</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Điểm theo loại</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Số bài</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Chuyên cần</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Cảnh báo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr key={row.student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{row.student.name}</div>
                      <div className="text-xs text-slate-500">{row.student.code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {row.classes.length > 0 ? row.classes.join(', ') : '—'}
                    </td>
                    <td className={`px-4 py-3 text-center text-sm font-semibold ${scoreColor(row.avgScore)}`}>
                      {row.avgScore !== null ? row.avgScore : '—'}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-900">{row.assessmentCount}</td>
                    <td className="px-4 py-3 text-center text-sm text-slate-900">
                      {row.attendanceRate !== null ? `${row.attendanceRate}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.openWarnings > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {row.openWarnings}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="text-center py-12">
                <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có dữ liệu</h3>
                <p className="mt-1 text-sm text-slate-500">Thử đổi bộ lọc lớp.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
