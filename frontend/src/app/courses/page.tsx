'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Search, Users, Clock, DollarSign } from 'lucide-react';

interface Course {
  id: string;
  code: string;
  name: string;
  level: string;
  textbook?: string;
  totalSessions?: number;
  totalHours?: number;
  standardFee?: number;
  isActive: boolean;
  _count: {
    classes: number;
    enrollments: number;
  };
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    level: 'N5',
    textbook: '',
    goal: '',
    totalSessions: '',
    totalHours: '',
    standardFee: '',
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          level: formData.level,
          textbook: formData.textbook || undefined,
          goal: formData.goal || undefined,
          totalSessions: formData.totalSessions ? parseInt(formData.totalSessions) : undefined,
          totalHours: formData.totalHours ? parseInt(formData.totalHours) : undefined,
          standardFee: formData.standardFee ? parseFloat(formData.standardFee) : undefined,
        }),
      });
      if (response.ok) {
        setShowForm(false);
        setFormData({ name: '', level: 'N5', textbook: '', goal: '', totalSessions: '', totalHours: '', standardFee: '' });
        fetchCourses();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to create course');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const formatFee = (fee?: number) => {
    if (!fee) return '—';
    return new Intl.NumberFormat('vi-VN').format(fee) + 'đ';
  };

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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Khóa học</h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <button
              onClick={() => router.push('/classes')}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              <Users className="mr-2 h-4 w-4" />
              Lớp học
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Thêm Khóa học
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="mt-6 bg-white border border-slate-200 shadow-sm sm:rounded-lg p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Tạo khóa học mới</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tên khóa học *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Tiếng Nhật N5 - Sơ cấp"
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Cấp độ *</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                >
                  {['N5', 'N4', 'N3', 'N2', 'N1', 'Kaiwa', 'Kurisu'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Giáo trình</label>
                <input
                  type="text"
                  value={formData.textbook}
                  onChange={(e) => setFormData({ ...formData, textbook: e.target.value })}
                  placeholder="VD: Minna no Nihongo"
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Mục tiêu</label>
                <input
                  type="text"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  placeholder="VD: Đạt N5 JLPT"
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Số buổi học</label>
                <input
                  type="number"
                  value={formData.totalSessions}
                  onChange={(e) => setFormData({ ...formData, totalSessions: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tổng giờ</label>
                <input
                  type="number"
                  value={formData.totalHours}
                  onChange={(e) => setFormData({ ...formData, totalHours: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Học phí chuẩn (VNĐ)</label>
                <input
                  type="number"
                  value={formData.standardFee}
                  onChange={(e) => setFormData({ ...formData, standardFee: e.target.value })}
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
                  {submitting ? 'Đang lưu...' : 'Tạo khóa học'}
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
              placeholder="Tìm kiếm khóa học..."
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Course Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/courses/${course.id}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                    {course.level}
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">{course.name}</h3>
                  <p className="text-sm text-slate-500">{course.code}</p>
                </div>
                <BookOpen className="h-6 w-6 text-slate-400" />
              </div>

              {course.textbook && (
                <p className="mt-2 text-sm text-slate-600">📖 {course.textbook}</p>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-lg font-semibold text-slate-900">{course._count.classes}</div>
                  <div className="text-xs text-slate-500">Lớp</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-lg font-semibold text-slate-900">{course._count.enrollments}</div>
                  <div className="text-xs text-slate-500">Đăng ký</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-lg font-semibold text-slate-900">{course.totalSessions || '—'}</div>
                  <div className="text-xs text-slate-500">Buổi</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-600 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {course.totalHours ? `${course.totalHours}h` : '—'}
                </span>
                <span className="font-medium text-brand-600 flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {formatFee(course.standardFee)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="mt-8 bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có khóa học nào</h3>
              <p className="mt-1 text-sm text-slate-500">
                Bắt đầu bằng cách tạo khóa học đầu tiên.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
