'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Users, Calendar, Clock, DollarSign, Edit } from 'lucide-react';

interface CourseDetail {
  id: string;
  code: string;
  name: string;
  level: string;
  textbook?: string;
  goal?: string;
  totalSessions?: number;
  totalHours?: number;
  standardFee?: number;
  content?: string;
  testSchedule?: string;
  completionStandard?: string;
  isActive: boolean;
  classes: Array<{
    id: string;
    code: string;
    startDate: string;
    endDate: string;
    status: string;
    mainTeacher?: { id: string; name: string };
    _count: { classMembers: number; sessions: number };
  }>;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) fetchCourse(params.id as string);
  }, [params.id]);

  const fetchCourse = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) setCourse(await response.json());
    } catch (error) {
      console.error('Failed to fetch course:', error);
    } finally {
      setLoading(false);
    }
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

  const formatFee = (fee?: number) =>
    fee ? new Intl.NumberFormat('vi-VN').format(fee) + 'đ' : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h3 className="text-sm font-medium text-slate-900">Khóa học không tồn tại</h3>
        <button
          onClick={() => router.push('/courses')}
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/courses')}
                className="mr-4 p-2 text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">{course.name}</h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                    {course.level}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{course.code}</p>
              </div>
            </div>
            <button className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
              <Edit className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Thông tin khóa học</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {course.textbook && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Giáo trình</dt>
                    <dd className="mt-1 text-sm text-slate-900">{course.textbook}</dd>
                  </div>
                )}
                {course.goal && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Mục tiêu</dt>
                    <dd className="mt-1 text-sm text-slate-900">{course.goal}</dd>
                  </div>
                )}
                {course.completionStandard && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Chuẩn đầu ra</dt>
                    <dd className="mt-1 text-sm text-slate-900">{course.completionStandard}</dd>
                  </div>
                )}
                {course.testSchedule && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Lịch kiểm tra</dt>
                    <dd className="mt-1 text-sm text-slate-900">{course.testSchedule}</dd>
                  </div>
                )}
                {course.content && (
                  <div className="md:col-span-2">
                    <dt className="text-sm font-medium text-slate-500">Nội dung</dt>
                    <dd className="mt-1 text-sm text-slate-900 whitespace-pre-line">{course.content}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Thống kê</h3>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Số buổi
                </span>
                <span className="text-sm font-medium text-slate-900">{course.totalSessions || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Tổng giờ
                </span>
                <span className="text-sm font-medium text-slate-900">{course.totalHours ? `${course.totalHours}h` : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Học phí
                </span>
                <span className="text-sm font-medium text-brand-600">{formatFee(course.standardFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Số lớp
                </span>
                <span className="text-sm font-medium text-slate-900">{course.classes.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Classes */}
        <div className="bg-white border border-slate-200 shadow-sm sm:rounded-xl">
          <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Các lớp ({course.classes.length})</h3>
            <button
              onClick={() => router.push('/classes')}
              className="text-sm text-brand-600 hover:underline"
            >
              Quản lý lớp →
            </button>
          </div>
          <ul className="divide-y divide-slate-200">
            {course.classes.map((cls) => (
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
                      <div className="text-sm font-medium text-slate-900">{cls.code}</div>
                      <div className="text-sm text-slate-500">
                        {new Date(cls.startDate).toLocaleDateString('vi-VN')} → {new Date(cls.endDate).toLocaleDateString('vi-VN')}
                        {cls.mainTeacher && ` • ${cls.mainTeacher.name}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-slate-500">
                      {cls._count.classMembers} HV • {cls._count.sessions} buổi
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {getStatusLabel(cls.status)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
            {course.classes.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                Chưa có lớp nào cho khóa học này
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
