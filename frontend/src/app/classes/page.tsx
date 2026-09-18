'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Search, Users, Calendar, AlertTriangle, User } from 'lucide-react';

interface ClassItem {
  id: string;
  code: string;
  format: string;
  startDate: string;
  endDate: string;
  maxStudents?: number;
  currentStudents: number;
  status: string;
  meetingLink?: string;
  course: { id: string; code: string; name: string; level: string };
  mainTeacher?: { id: string; name: string };
  supportTeacher?: { id: string; name: string };
  _count: { classMembers: number; sessions: number };
}

interface Course {
  id: string;
  code: string;
  name: string;
  level: string;
}

interface Teacher {
  id: string;
  code: string;
  name: string;
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    courseId: '',
    startDate: '',
    endDate: '',
    maxStudents: '',
    mainTeacherId: '',
    supportTeacherId: '',
    schedule: '',
    meetingLink: '',
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const [classesRes, coursesRes, teachersRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teachers`, { headers }),
    ]);

    if (classesRes.ok) setClasses((await classesRes.json()).data);
    if (coursesRes.ok) setCourses((await coursesRes.json()).data);
    if (teachersRes.ok) setTeachers((await teachersRes.json()).data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: formData.courseId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          maxStudents: formData.maxStudents ? parseInt(formData.maxStudents) : undefined,
          mainTeacherId: formData.mainTeacherId || undefined,
          supportTeacherId: formData.supportTeacherId || undefined,
          schedule: formData.schedule || undefined,
          meetingLink: formData.meetingLink || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setShowForm(false);
        setFormData({ courseId: '', startDate: '', endDate: '', maxStudents: '', mainTeacherId: '', supportTeacherId: '', schedule: '', meetingLink: '' });
        fetchAll();
      } else {
        setError(data.detail || data.error || 'Failed to create class');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: 'bg-slate-100 text-slate-800',
      recruiting: 'bg-brand-100 text-brand-800',
      full: 'bg-yellow-100 text-yellow-800',
      studying: 'bg-green-100 text-green-800',
      paused: 'bg-orange-100 text-orange-800',
      finished: 'bg-slate-100 text-slate-600',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planned: 'Dự kiến',
      recruiting: 'Tuyển sinh',
      full: 'Đã đủ',
      studying: 'Đang học',
      paused: 'Tạm dừng',
      finished: 'Kết thúc',
    };
    return labels[status] || status;
  };

  const filtered = classes.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.course.name.toLowerCase().includes(search.toLowerCase())
  );

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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Quản lý lớp học</h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <button
              onClick={() => router.push('/courses')}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              Khóa học
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Thêm Lớp
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="mt-6 bg-white border border-slate-200 shadow-sm sm:rounded-lg p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Tạo lớp mới</h3>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Khóa học *</label>
                <select
                  required
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="">Chọn khóa học</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Sĩ số tối đa</label>
                <input
                  type="number"
                  value={formData.maxStudents}
                  onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Ngày bắt đầu *</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Ngày kết thúc *</label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">GV chính</label>
                <select
                  value={formData.mainTeacherId}
                  onChange={(e) => setFormData({ ...formData, mainTeacherId: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="">Chọn giáo viên</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">GV phụ</label>
                <select
                  value={formData.supportTeacherId}
                  onChange={(e) => setFormData({ ...formData, supportTeacherId: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="">Chọn giáo viên</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Lịch học</label>
                <input
                  type="text"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  placeholder="VD: Tối 2-4-6, 19:30-21:30"
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Link họp</label>
                <input
                  type="text"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  placeholder="https://meet.google.com/..."
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
                  {submitting ? 'Đang lưu...' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="mt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm lớp..."
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Classes Table */}
        <div className="mt-6 bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
          <ul className="divide-y divide-slate-200">
            {filtered.map((cls) => (
              <li key={cls.id}>
                <div
                  className="px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/classes/${cls.id}`)}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-brand-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900">
                        {cls.code} — {cls.course.name}
                      </div>
                      <div className="text-sm text-slate-500 flex items-center space-x-3">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(cls.startDate).toLocaleDateString('vi-VN')} → {new Date(cls.endDate).toLocaleDateString('vi-VN')}
                        </span>
                        {cls.mainTeacher && (
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {cls.mainTeacher.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-slate-500">
                      {cls._count.classMembers}{cls.maxStudents ? `/${cls.maxStudents}` : ''} HV
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cls.status)}`}>
                      {getStatusLabel(cls.status)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
            <Users className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có lớp nào</h3>
            <p className="mt-1 text-sm text-slate-500">Tạo lớp đầu tiên cho khóa học.</p>
          </div>
        )}
      </div>
    </div>
  );
}
