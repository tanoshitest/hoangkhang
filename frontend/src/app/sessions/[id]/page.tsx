'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, User, Video, BookOpen, CheckCircle, Save, AlertTriangle } from 'lucide-react';

interface Student {
  id: string;
  code: string;
  name: string;
}

interface AttendanceRecord {
  studentId: string;
  status: string;
  notes: string;
}

interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  meetingLink?: string;
  plannedContent?: string;
  actualContent?: string;
  homework?: string;
  notes?: string;
  class: {
    id: string;
    code: string;
    course: { name: string; level: string };
    classMembers: Array<{
      id: string;
      status: string;
      student: Student;
    }>;
  };
  teacher: { id: string; name: string; phone: string };
  attendances: Array<{
    id: string;
    status: string;
    notes?: string;
    student: Student;
  }>;
  progress: Array<{
    id: string;
    studentId: string;
    testScore?: number;
    completionRate?: number;
    teacherComment?: string;
    skillsToImprove?: string;
  }>;
}

const attendanceStatuses = [
  { value: 'present', label: 'Có mặt', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'late', label: 'Đi muộn', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'early_leave', label: 'Về sớm', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'excused_absent', label: 'Vắng có phép', color: 'bg-brand-100 text-brand-800 border-brand-300' },
  { value: 'unexcused_absent', label: 'Vắng không phép', color: 'bg-red-100 text-red-800 border-red-300' },
];

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [sessionInfo, setSessionInfo] = useState({ actualContent: '', homework: '', notes: '', status: '' });
  const [progressMap, setProgressMap] = useState<Record<string, { testScore: string; completionRate: string; teacherComment: string }>>({});
  const [savingProgress, setSavingProgress] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (params.id) fetchSession(params.id as string);
  }, [params.id]);

  const fetchSession = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSession(data);
        setSessionInfo({
          actualContent: data.actualContent || '',
          homework: data.homework || '',
          notes: data.notes || '',
          status: data.status,
        });
        // Build attendance map from existing records
        const map: Record<string, AttendanceRecord> = {};
        data.class.classMembers.forEach((m: any) => {
          const existing = data.attendances.find((a: any) => a.student.id === m.student.id);
          map[m.student.id] = {
            studentId: m.student.id,
            status: existing?.status || 'present',
            notes: existing?.notes || '',
          };
        });
        setAttendanceMap(map);
        // Build progress map from existing records
        const pMap: Record<string, { testScore: string; completionRate: string; teacherComment: string }> = {};
        data.class.classMembers.forEach((m: any) => {
          const existing = (data.progress || []).find((p: any) => p.studentId === m.student.id);
          pMap[m.student.id] = {
            testScore: existing?.testScore != null ? String(existing.testScore) : '',
            completionRate: existing?.completionRate != null ? String(existing.completionRate) : '',
            teacherComment: existing?.teacherComment || '',
          };
        });
        setProgressMap(pMap);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (studentId: string) => {
    const p = progressMap[studentId];
    if (!p) return;
    setSavingProgress(studentId);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${params.id}/progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          testScore: p.testScore !== '' ? Number(p.testScore) : undefined,
          completionRate: p.completionRate !== '' ? Number(p.completionRate) : undefined,
          teacherComment: p.teacherComment || undefined,
        }),
      });
      setSaveMessage('Đã lưu điểm/nhận xét');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSavingProgress(null);
    }
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const attendances = Object.values(attendanceMap);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${params.id}/attendance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attendances }),
      });
      if (response.ok) {
        setSaveMessage('Đã lưu điểm danh');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveSessionInfo = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionInfo),
      });
      if (response.ok) {
        setSaveMessage('Đã lưu thông tin buổi học');
        setTimeout(() => setSaveMessage(''), 3000);
        fetchSession(params.id as string);
      }
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status: string) => {
    const newMap = { ...attendanceMap };
    Object.keys(newMap).forEach(k => {
      newMap[k] = { ...newMap[k], status };
    });
    setAttendanceMap(newMap);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <h3 className="text-sm font-medium text-slate-900">Buổi học không tồn tại</h3>
        <button
          onClick={() => router.push('/sessions')}
          className="mt-4 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/sessions')}
                className="mr-4 p-2 text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {session.class.code} — {session.class.course.name}
                </h1>
                <p className="text-sm text-slate-500 flex items-center space-x-3 mt-1">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date(session.date).toLocaleDateString('vi-VN')} {session.startTime}-{session.endTime}
                  </span>
                  <span className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {session.teacher.name}
                  </span>
                  {session.meetingLink && (
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-brand-600 hover:underline"
                    >
                      <Video className="h-4 w-4 mr-1" />
                      Meeting
                    </a>
                  )}
                </p>
              </div>
            </div>
            {saveMessage && (
              <div className="flex items-center text-green-600 text-sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                {saveMessage}
              </div>
            )}
          </div>
        </div>

        {/* Session Info Form */}
        <div className="bg-white border border-slate-200 shadow-sm sm:rounded-lg p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Thông tin buổi học
          </h3>
          {session.plannedContent && (
            <p className="text-sm text-slate-500 mb-4">Nội dung dự kiến: {session.plannedContent}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nội dung thực dạy</label>
              <input
                type="text"
                value={sessionInfo.actualContent}
                onChange={(e) => setSessionInfo({ ...sessionInfo, actualContent: e.target.value })}
                className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Bài tập về nhà</label>
              <input
                type="text"
                value={sessionInfo.homework}
                onChange={(e) => setSessionInfo({ ...sessionInfo, homework: e.target.value })}
                className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Ghi chú</label>
              <input
                type="text"
                value={sessionInfo.notes}
                onChange={(e) => setSessionInfo({ ...sessionInfo, notes: e.target.value })}
                className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Trạng thái</label>
              <select
                value={sessionInfo.status}
                onChange={(e) => setSessionInfo({ ...sessionInfo, status: e.target.value })}
                className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
              >
                <option value="planned">Dự kiến</option>
                <option value="taught">Đã dạy</option>
                <option value="absent">Vắng</option>
                <option value="makeup">Học bù</option>
                <option value="rescheduled">Đổi lịch</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={saveSessionInfo}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />
              Lưu thông tin
            </button>
          </div>
        </div>

        {/* Attendance */}
        <div className="bg-white border border-slate-200 shadow-sm sm:rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              Điểm danh ({session.class.classMembers.length} học viên)
            </h3>
            <button
              onClick={() => markAll('present')}
              className="text-sm text-brand-600 hover:underline"
            >
              Tất cả có mặt
            </button>
          </div>
          <ul className="divide-y divide-slate-200">
            {session.class.classMembers.map((member) => {
              const record = attendanceMap[member.student.id];
              if (!record) return null;
              return (
                <li key={member.id} className="px-6 py-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{member.student.name}</div>
                      <div className="text-xs text-slate-500">{member.student.code}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attendanceStatuses.map((st) => (
                        <button
                          key={st.value}
                          onClick={() => setAttendanceMap({
                            ...attendanceMap,
                            [member.student.id]: { ...record, status: st.value },
                          })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            record.status === st.value
                              ? st.color + ' ring-1 ring-current'
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {record.status !== 'present' && (
                    <input
                      type="text"
                      placeholder="Ghi chú..."
                      value={record.notes}
                      onChange={(e) => setAttendanceMap({
                        ...attendanceMap,
                        [member.student.id]: { ...record, notes: e.target.value },
                      })}
                      className="mt-2 block w-full md:w-1/2 border border-slate-300 rounded-lg py-1.5 px-3 text-sm"
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
            <button
              onClick={saveAttendance}
              disabled={saving}
              className="inline-flex items-center px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
            </button>
          </div>
        </div>

        {/* Scores & Comments */}
        <div className="bg-white border border-slate-200 shadow-sm sm:rounded-lg mt-6">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Điểm & Nhận xét</h3>
          </div>
          <ul className="divide-y divide-slate-200">
            {session.class.classMembers.map((member) => {
              const p = progressMap[member.student.id] || { testScore: '', completionRate: '', teacherComment: '' };
              return (
                <li key={member.id} className="px-6 py-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="md:w-48">
                      <div className="text-sm font-medium text-slate-900">{member.student.name}</div>
                      <div className="text-xs text-slate-500">{member.student.code}</div>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <input
                        type="number" step="0.5" min="0" placeholder="Điểm"
                        value={p.testScore}
                        onChange={(e) => setProgressMap({
                          ...progressMap,
                          [member.student.id]: { ...p, testScore: e.target.value },
                        })}
                        className="w-20 border border-slate-300 rounded-lg py-1.5 px-2 text-sm"
                      />
                      <input
                        type="number" min="0" max="100" placeholder="% HT"
                        value={p.completionRate}
                        onChange={(e) => setProgressMap({
                          ...progressMap,
                          [member.student.id]: { ...p, completionRate: e.target.value },
                        })}
                        className="w-20 border border-slate-300 rounded-lg py-1.5 px-2 text-sm"
                      />
                      <input
                        type="text" placeholder="Nhận xét của giáo viên..."
                        value={p.teacherComment}
                        onChange={(e) => setProgressMap({
                          ...progressMap,
                          [member.student.id]: { ...p, teacherComment: e.target.value },
                        })}
                        className="flex-1 min-w-40 border border-slate-300 rounded-lg py-1.5 px-3 text-sm"
                      />
                      <button
                        onClick={() => saveProgress(member.student.id)}
                        disabled={savingProgress === member.student.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
                      >
                        {savingProgress === member.student.id ? 'Lưu...' : 'Lưu'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
