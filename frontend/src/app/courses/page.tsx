'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { formatVND } from '@/lib/utils';

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
    return formatVND(fee);
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

        {/* Courses Table */}
        <Card className="mt-6 overflow-hidden">
          <CardHeader className="flex-col items-start gap-3">
            <div className="flex w-full items-start justify-between gap-4">
              <div>
                <CardTitle>Danh sách khóa học ({filteredCourses.length})</CardTitle>
                <CardDescription>Bấm vào tên khóa học để xem chi tiết và danh sách lớp.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/classes"
                  className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                >
                  Lớp học
                </Link>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
                >
                  <Plus className="-ml-1 mr-1.5 h-4 w-4" />
                  Thêm khóa học
                </button>
              </div>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã khóa học..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>

          <Table>
            <THead>
              <TR>
                <TH className="w-10">#</TH>
                <TH>Mã</TH>
                <TH>Khóa học</TH>
                <TH>Level</TH>
                <TH>Giáo trình</TH>
                <TH className="text-center">Buổi</TH>
                <TH className="text-center">Giờ</TH>
                <TH className="text-right">Học phí</TH>
                <TH className="text-center">Lớp</TH>
                <TH>Trạng thái</TH>
              </TR>
            </THead>
            <TBody>
              {filteredCourses.length === 0 ? (
                <EmptyRow colSpan={10}>Chưa có khóa học nào.</EmptyRow>
              ) : (
                filteredCourses.map((course, index) => (
                  <TR key={course.id}>
                    <TD className="text-xs text-slate-400">{index + 1}</TD>
                    <TD className="whitespace-nowrap font-mono text-xs text-slate-500">
                      {course.code}
                    </TD>
                    <TD>
                      <Link
                        href={`/courses/${course.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {course.name}
                      </Link>
                    </TD>
                    <TD>
                      <Badge tone="brand">{course.level}</Badge>
                    </TD>
                    <TD className="whitespace-nowrap">
                      {course.textbook || <span className="text-slate-400">—</span>}
                    </TD>
                    <TD className="text-center">{course.totalSessions || '—'}</TD>
                    <TD className="text-center">{course.totalHours ? `${course.totalHours}h` : '—'}</TD>
                    <TD className="text-right whitespace-nowrap">{formatFee(course.standardFee)}</TD>
                    <TD className="text-center">{course._count?.classes ?? 0}</TD>
                    <TD>
                      <Badge tone={course.isActive ? 'green' : 'slate'}>
                        {course.isActive ? 'Hoạt động' : 'Ngừng'}
                      </Badge>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
