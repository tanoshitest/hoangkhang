'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, MoreHorizontal, BookOpen, Users, Calendar, ArrowLeft } from 'lucide-react';
import { SalesTabs } from '@/components/SalesTabs';

interface Enrollment {
  id: string;
  status: string;
  enrolledAt: string;
  startDate?: string;
  endDate?: string;
  student: {
    id: string;
    code: string;
    name: string;
  };
  course: {
    id: string;
    code: string;
    name: string;
  };
  class?: {
    id: string;
    code: string;
  };
  events?: Array<{
    id: string;
    type: string;
    effectiveDate: string;
    reason?: string;
  }>;
}

export default function EnrollmentsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const token = localStorage.getItem('token');
      // This would need a proper API endpoint for enrollments
      // For now, we'll fetch from students and extract enrollments
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const allEnrollments = data.data.flatMap((student: any) => 
          student.enrollments.map((enrollment: any) => ({
            ...enrollment,
            student: {
              id: student.id,
              code: student.code,
              name: student.name,
            }
          }))
        );
        setEnrollments(allEnrollments);
      }
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      enrolled: 'bg-brand-100 text-brand-800',
      studying: 'bg-green-100 text-green-800',
      completed: 'bg-slate-100 text-slate-800',
      dropped: 'bg-red-100 text-red-800',
      reserved: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      enrolled: 'Đã đăng ký',
      studying: 'Đang học',
      completed: 'Hoàn thành',
      dropped: 'Nghỉ học',
      reserved: 'Bảo lưu',
    };
    return labels[status] || status;
  };

  const getEventTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      enroll: 'Đăng ký',
      assign_class: 'Xếp lớp',
      transfer: 'Chuyển lớp',
      reserve: 'Bảo lưu',
      resume: 'Tiếp tục',
      drop: 'Nghỉ học',
      complete: 'Hoàn thành',
    };
    return types[type] || type;
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <SalesTabs />
          </div>
          <button
            onClick={() => router.push('/enrollments/new')}
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="-ml-1 mr-1.5 h-4 w-4" />
            Đăng ký mới
          </button>
        </div>

        {/* Search and Filter */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm ghi danh..."
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
            <Filter className="mr-2 h-4 w-4" />
            Lọc
          </button>
        </div>

        {/* Enrollments Table */}
        <div className="mt-8 bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
          <ul className="divide-y divide-slate-200">
            {enrollments.map((enrollment) => (
              <li key={enrollment.id}>
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-brand-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">
                          {enrollment.student.name} ({enrollment.student.code})
                        </div>
                        <div className="text-sm text-slate-500">
                          {enrollment.course.name} ({enrollment.course.code})
                          {enrollment.class && ` • ${enrollment.class.code}`}
                        </div>
                        <div className="text-sm text-slate-500">
                          Đăng ký: {new Date(enrollment.enrolledAt).toLocaleDateString('vi-VN')}
                          {enrollment.startDate && ` • Bắt đầu: ${new Date(enrollment.startDate).toLocaleDateString('vi-VN')}`}
                          {enrollment.endDate && ` • Kết thúc: ${new Date(enrollment.endDate).toLocaleDateString('vi-VN')}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                        {getStatusLabel(enrollment.status)}
                      </span>
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Events */}
                  {(enrollment.events?.length ?? 0) > 0 && (
                    <div className="mt-3 ml-14">
                      <h4 className="text-sm font-medium text-slate-900 mb-2">Lịch sử sự kiện:</h4>
                      <div className="space-y-1">
                        {enrollment.events!.map((event) => (
                          <div key={event.id} className="text-sm text-slate-600">
                            • {getEventTypeLabel(event.type)} - {new Date(event.effectiveDate).toLocaleDateString('vi-VN')}
                            {event.reason && ` (${event.reason})`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {enrollments.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có ghi danh nào</h3>
            <p className="mt-1 text-sm text-slate-500">
              Bắt đầu bằng cách đăng ký học viên vào khóa học.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
