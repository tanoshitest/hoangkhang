'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Clock, User, Video, AlertTriangle, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  meetingLink?: string;
  plannedContent?: string;
  actualContent?: string;
  class: {
    id: string;
    code: string;
    course: { name: string };
  };
  teacher: { id: string; name: string };
  _count: { attendances: number };
}

interface ClassOption {
  id: string;
  code: string;
  course: { name: string };
}

interface Teacher {
  id: string;
  name: string;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [formData, setFormData] = useState({
    classId: '',
    date: '',
    startTime: '',
    endTime: '',
    teacherId: '',
    meetingLink: '',
    plannedContent: '',
  });

  useEffect(() => {
    fetchData();
  }, [weekOffset]);

  const getWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { monday, sunday };
  };

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    const { monday, sunday } = getWeekRange();

    const [sessionsRes, classesRes, teachersRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions?dateFrom=${monday.toISOString()}&dateTo=${sunday.toISOString()}`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teachers`, { headers }),
    ]);

    if (sessionsRes.ok) setSessions((await sessionsRes.json()).data);
    if (classesRes.ok) setClasses((await classesRes.json()).data);
    if (teachersRes.ok) setTeachers((await teachersRes.json()).data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: formData.classId,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          teacherId: formData.teacherId,
          meetingLink: formData.meetingLink || undefined,
          plannedContent: formData.plannedContent || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setShowForm(false);
        setFormData({ classId: '', date: '', startTime: '', endTime: '', teacherId: '', meetingLink: '', plannedContent: '' });
        fetchData();
      } else {
        setError(data.detail || data.error || 'Failed to create session');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: 'bg-brand-100 text-brand-800',
      taught: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      makeup: 'bg-purple-100 text-purple-800',
      rescheduled: 'bg-yellow-100 text-yellow-800',
      teacher_changed: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planned: 'Dự kiến',
      taught: 'Đã dạy',
      absent: 'Vắng',
      makeup: 'Học bù',
      rescheduled: 'Đổi lịch',
      teacher_changed: 'Đổi GV',
    };
    return labels[status] || status;
  };

  const { monday, sunday } = getWeekRange();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const sessionsByDay = (day: Date) =>
    sessions.filter(s => new Date(s.date).toDateString() === day.toDateString());

  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Lịch dạy</h1>
            <p className="text-sm text-slate-500">
              {monday.toLocaleDateString('vi-VN')} — {sunday.toLocaleDateString('vi-VN')}
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="p-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
              >
                Tuần này
              </button>
              <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="p-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Thêm Session
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="mt-6 bg-white border border-slate-200 shadow-sm sm:rounded-lg p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Tạo session mới</h3>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Lớp *</label>
                <select
                  required
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="">Chọn lớp</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.course.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Giáo viên *</label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="">Chọn giáo viên</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Ngày *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Bắt đầu *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Kết thúc *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Link meeting</label>
                <input
                  type="text"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Nội dung dự kiến</label>
                <input
                  type="text"
                  value={formData.plannedContent}
                  onChange={(e) => setFormData({ ...formData, plannedContent: e.target.value })}
                  placeholder="VD: Bài 5 - Ngữ pháp"
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div className="md:col-span-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Tạo session'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Week Grid */}
        <div className="mt-6 grid grid-cols-7 gap-3">
          {weekDays.map((day, i) => {
            const daySessions = sessionsByDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={i} className="min-h-48">
                <div className={`text-center py-2 rounded-t-lg text-sm font-medium ${
                  isToday ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  <div>{dayNames[i]}</div>
                  <div className="text-xs">{day.getDate()}/{day.getMonth() + 1}</div>
                </div>
                <div className="space-y-2 mt-2">
                  {daySessions.length === 0 ? (
                    <div className="text-center text-xs text-slate-300 py-4">—</div>
                  ) : (
                    daySessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => router.push(`/sessions/${session.id}`)}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="text-xs font-medium text-slate-900 truncate">
                          {session.class.code}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                          {session.startTime}-{session.endTime}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center mt-0.5 truncate">
                          <User className="h-3 w-3 mr-1 flex-shrink-0" />
                          {session.teacher.name}
                        </div>
                        <div className="mt-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(session.status)}`}>
                            {getStatusLabel(session.status)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
            <Calendar className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">Không có session nào tuần này</h3>
            <p className="mt-1 text-sm text-slate-500">Tạo session hoặc chuyển sang tuần khác.</p>
          </div>
        )}
      </div>
    </div>
  );
}
