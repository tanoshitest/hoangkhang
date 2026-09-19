'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import ScheduleSlotsEditor, { type ScheduleSlot } from '@/components/ScheduleSlotsEditor';

interface ClassItem {
  id: string;
  code: string;
  format: string;
  classType?: string;
  shift?: string;
  startDate: string;
  endDate: string;
  minStudents?: number;
  maxStudents?: number;
  currentStudents: number;
  status: string;
  meetingLink?: string;
  driveLink?: string;
  videoLink?: string;
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
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [formData, setFormData] = useState({
    courseId: '',
    classType: 'group',
    shift: '',
    startDate: '',
    endDate: '',
    minStudents: '2',
    maxStudents: '10',
    mainTeacherId: '',
    supportTeacherId: '',
    schedule: '',
    meetingLink: '',
    driveLink: '',
    videoLink: '',
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
          classType: formData.classType,
          shift: formData.shift || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate,
          minStudents: formData.minStudents ? parseInt(formData.minStudents) : undefined,
          maxStudents: formData.maxStudents ? parseInt(formData.maxStudents) : undefined,
          mainTeacherId: formData.mainTeacherId || undefined,
          supportTeacherId: formData.supportTeacherId || undefined,
          schedule: formData.schedule || undefined,
          scheduleSlots: slots.length ? slots : undefined,
          meetingLink: formData.meetingLink || undefined,
          driveLink: formData.driveLink || undefined,
          videoLink: formData.videoLink || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setShowForm(false);
        setFormData({ courseId: '', classType: 'group', shift: '', startDate: '', endDate: '', minStudents: '2', maxStudents: '10', mainTeacherId: '', supportTeacherId: '', schedule: '', meetingLink: '', driveLink: '', videoLink: '' });
        setSlots([]);
        fetchAll();
      } else {
        setError(data.detail || data.error || 'Failed to create class');
      }
    } finally {
      setSubmitting(false);
    }
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
                <label className="block text-sm font-medium text-slate-700">Hình thức lớp *</label>
                <select
                  value={formData.classType}
                  onChange={(e) => setFormData({ ...formData, classType: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="group">Lớp nhóm (2-10 HV)</option>
                  <option value="one_on_one">Kèm 1-1</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Ca dạy</label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="">— Chọn ca —</option>
                  <option value="morning">Sáng (8:00-11:00)</option>
                  <option value="afternoon">Chiều (14:00-16:00)</option>
                  <option value="evening">Tối (19:00-21:00)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Sĩ số tối thiểu{formData.classType === 'group' && ' (chưa đủ → Giữ chỗ)'}
                </label>
                <input
                  type="number" min={1}
                  value={formData.minStudents}
                  onChange={(e) => setFormData({ ...formData, minStudents: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Lịch tuần cố định (tự tạo buổi học)</label>
                <div className="mt-1">
                  <ScheduleSlotsEditor value={slots} onChange={setSlots} />
                </div>
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
              <div>
                <label className="block text-sm font-medium text-slate-700">Link Drive tài liệu</label>
                <input
                  type="text"
                  value={formData.driveLink}
                  onChange={(e) => setFormData({ ...formData, driveLink: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Link video (học bù)</label>
                <input
                  type="text"
                  value={formData.videoLink}
                  onChange={(e) => setFormData({ ...formData, videoLink: e.target.value })}
                  placeholder="https://drive.google.com/... (folder video)"
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

        {/* Classes Table */}
        <Card className="mt-6 overflow-hidden">
          <CardHeader className="flex-col items-start gap-3">
            <div className="flex w-full items-start justify-between gap-4">
              <div>
                <CardTitle>Danh sách lớp ({filtered.length})</CardTitle>
                <CardDescription>Bấm vào mã lớp để xem chi tiết và quản lý buổi học.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/courses"
                  className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                >
                  Khóa học
                </Link>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
                >
                  <Plus className="-ml-1 mr-1.5 h-4 w-4" />
                  Thêm lớp
                </button>
              </div>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã lớp, khóa học..."
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
                <TH>Mã lớp</TH>
                <TH>Khóa học</TH>
                <TH>Hình thức / Ca</TH>
                <TH>GV chính</TH>
                <TH>Thời gian</TH>
                <TH className="text-center">Sĩ số</TH>
                <TH className="text-center">Buổi</TH>
                <TH>Trạng thái</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.length === 0 ? (
                <EmptyRow colSpan={9}>Chưa có lớp nào.</EmptyRow>
              ) : (
                filtered.map((cls, index) => (
                  <TR key={cls.id}>
                    <TD className="text-xs text-slate-400">{index + 1}</TD>
                    <TD>
                      <Link
                        href={`/classes/${cls.id}`}
                        className="font-medium text-brand-700 hover:underline whitespace-nowrap"
                      >
                        {cls.code}
                      </Link>
                    </TD>
                    <TD className="whitespace-nowrap">{cls.course.name}</TD>
                    <TD className="whitespace-nowrap text-xs">
                      <div className="text-slate-700">{cls.classType === 'one_on_one' ? 'Kèm 1-1' : 'Nhóm'}</div>
                      <div className="text-slate-400">
                        {({ morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' } as Record<string, string>)[cls.shift || ''] || '—'}
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap">
                      {cls.mainTeacher?.name || <span className="text-slate-400">—</span>}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(cls.startDate)} → {formatDate(cls.endDate)}
                    </TD>
                    <TD className="text-center">
                      {cls._count?.classMembers ?? 0}{cls.maxStudents ? `/${cls.maxStudents}` : ''}
                    </TD>
                    <TD className="text-center">{cls._count?.sessions ?? 0}</TD>
                    <TD>
                      <StatusBadge value={cls.status} />
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
