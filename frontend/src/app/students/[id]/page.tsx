'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, User, BookOpen, Clock, CheckCircle, XCircle, AlertTriangle, FileText, Download, Upload } from 'lucide-react';

interface Student {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  educationLevel?: string;
  goal?: string;
  currentCourse?: string;
  currentClass?: string;
  assignedTeacher?: string;
  registeredDate: string;
  startDate?: string;
  expectedEndDate?: string;
  completedDate?: string;
  workSchedule?: string;
  supportNeeds?: string;
  notes?: string;
  referredBy?: string;
  status: string;
  contacts: Array<{
    id: string;
    name: string;
    relation: string;
    phone: string;
    isPrimary: boolean;
  }>;
  enrollments: Array<{
    id: string;
    status: string;
    enrolledAt: string;
    startDate?: string;
    endDate?: string;
    course: {
      id: string;
      name: string;
      code: string;
    };
    class?: {
      id: string;
      code: string;
    };
    events: Array<{
      id: string;
      type: string;
      effectiveDate: string;
      reason?: string;
    }>;
  }>;
  attendances: Array<{
    id: string;
    status: string;
    createdAt: string;
    session: {
      id: string;
      date: string;
      class: {
        id: string;
        code: string;
      };
    };
  }>;
  receivables: Array<{
    id: string;
    totalAmount: number;
    status: string;
    dueDate?: string;
    course: {
      id: string;
      name: string;
    };
    payments: Array<{
      id: string;
      amount: number;
      paymentDate: string;
      status: string;
    }>;
  }>;
  warnings: Array<{
    id: string;
    type: string;
    status: string;
    details?: string;
    createdAt: string;
  }>;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (params.id) {
      fetchStudent(params.id as string);
    }
  }, [params.id]);

  const fetchStudent = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudent(data);
      }
    } catch (error) {
      console.error('Failed to fetch student:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      waiting_class: 'bg-yellow-100 text-yellow-800',
      studying: 'bg-green-100 text-green-800',
      reserved: 'bg-brand-100 text-brand-800',
      transferred: 'bg-purple-100 text-purple-800',
      dropped: 'bg-red-100 text-red-800',
      completed: 'bg-slate-100 text-slate-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      waiting_class: 'Chờ xếp lớp',
      studying: 'Đang học',
      reserved: 'Bảo lưu',
      transferred: 'Chuyển lớp',
      dropped: 'Nghỉ học',
      completed: 'Hoàn thành',
    };
    return labels[status] || status;
  };

  const getAttendanceStatus = (status: string) => {
    const statuses: Record<string, { label: string; color: string; icon: any }> = {
      present: { label: 'Có mặt', color: 'text-green-600', icon: CheckCircle },
      excused_absent: { label: 'Vắng có phép', color: 'text-yellow-600', icon: AlertTriangle },
      unexcused_absent: { label: 'Vắng không phép', color: 'text-red-600', icon: XCircle },
      late: { label: 'Đi trễ', color: 'text-orange-600', icon: Clock },
      early_leave: { label: 'Về sớm', color: 'text-purple-600', icon: Clock },
    };
    return statuses[status] || { label: status, color: 'text-slate-600', icon: Clock };
  };

  const getWarningTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      consecutive_absent: 'Vắng liên tiếp',
      low_attendance: 'Chuyên cần thấp',
      below_standard: 'Điểm dưới chuẩn',
      no_homework: 'Không nộp bài',
      dropout_risk: 'Nguy cơ nghỉ',
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

  if (!student) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-slate-900">Học viên không tồn tại</h3>
        <button
          onClick={() => router.push('/students')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
        >
          <ArrowLeft className="-ml-1 mr-2 h-5 w-5" />
          Quay lại
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Tổng quan' },
    { id: 'history', name: 'Lịch sử học' },
    { id: 'enrollment', name: 'Ghi danh' },
    { id: 'attendance', name: 'Chuyên cần' },
    { id: 'results', name: 'Kết quả' },
    { id: 'finance', name: 'Học phí' },
    { id: 'warnings', name: 'Cảnh báo' },
    { id: 'attachments', name: 'Tệp đính kèm' },
    { id: 'changes', name: 'Lịch sử thay đổi' },
  ];

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/students')}
                className="mr-4 p-2 text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{student.name}</h1>
                <p className="text-sm text-slate-500">{student.code}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(student.status)}`}>
                {getStatusLabel(student.status)}
              </span>
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
                <Edit className="-ml-1 mr-2 h-4 w-4" />
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Info */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">Thông tin cá nhân</h3>
                  </div>
                  <div className="border-t border-slate-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-slate-200">
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-slate-500">Họ tên</dt>
                        <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{student.name}</dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-slate-500">Điện thoại</dt>
                        <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{student.phone}</dd>
                      </div>
                      {student.email && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Email</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{student.email}</dd>
                        </div>
                      )}
                      {student.birthDate && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Ngày sinh</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                            {new Date(student.birthDate).toLocaleDateString('vi-VN')}
                          </dd>
                        </div>
                      )}
                      {student.gender && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Giới tính</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                            {student.gender === 'male' ? 'Nam' : student.gender === 'female' ? 'Nữ' : 'Khác'}
                          </dd>
                        </div>
                      )}
                      {student.address && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Địa chỉ</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{student.address}</dd>
                        </div>
                      )}
                      {student.educationLevel && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Trình độ đầu vào</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{student.educationLevel}</dd>
                        </div>
                      )}
                      {student.goal && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Mục tiêu đầu ra</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{student.goal}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>

              {/* Side Info */}
              <div className="space-y-6">
                {/* Emergency Contact */}
                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">Liên hệ khẩn cấp</h3>
                  </div>
                  <div className="border-t border-slate-200 px-4 py-5">
                    {student.emergencyContact ? (
                      <dl className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-slate-500">Tên người liên hệ</dt>
                          <dd className="mt-1 text-sm text-slate-900">{student.emergencyContact}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-500">Số điện thoại</dt>
                          <dd className="mt-1 text-sm text-slate-900">{student.emergencyPhone}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm text-slate-500">Chưa có thông tin liên hệ khẩn cấp</p>
                    )}
                  </div>
                </div>

                {/* Current Status */}
                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">Tình trạng hiện tại</h3>
                  </div>
                  <div className="border-t border-slate-200 px-4 py-5">
                    <dl className="space-y-4">
                      {student.currentCourse && (
                        <div>
                          <dt className="text-sm font-medium text-slate-500">Khóa đang học</dt>
                          <dd className="mt-1 text-sm text-slate-900">{student.currentCourse}</dd>
                        </div>
                      )}
                      {student.currentClass && (
                        <div>
                          <dt className="text-sm font-medium text-slate-500">Lớp</dt>
                          <dd className="mt-1 text-sm text-slate-900">{student.currentClass}</dd>
                        </div>
                      )}
                      {student.assignedTeacher && (
                        <div>
                          <dt className="text-sm font-medium text-slate-500">Giáo viên phụ trách</dt>
                          <dd className="mt-1 text-sm text-slate-900">{student.assignedTeacher}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-sm font-medium text-slate-500">Ngày đăng ký</dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {new Date(student.registeredDate).toLocaleDateString('vi-VN')}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Lịch sử học</h3>
              </div>
              <div className="border-t border-slate-200">
                {student.enrollments.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có lịch sử học</h3>
                    <p className="mt-1 text-sm text-slate-500">Học viên chưa đăng ký khóa học nào.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {student.enrollments.map((enrollment) => (
                      <li key={enrollment.id} className="px-4 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-brand-600" />
                            </div>
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {enrollment.course.name}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {enrollment.course.code}
                                  {enrollment.class && ` • ${enrollment.class.code}`}
                                </div>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                enrollment.status === 'studying' ? 'bg-brand-100 text-brand-800' :
                                enrollment.status === 'dropped' ? 'bg-red-100 text-red-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {enrollment.status === 'completed' ? 'Hoàn thành' :
                                 enrollment.status === 'studying' ? 'Đang học' :
                                 enrollment.status === 'dropped' ? 'Nghỉ học' :
                                 enrollment.status === 'reserved' ? 'Bảo lưu' :
                                 enrollment.status}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-slate-500">
                              Đăng ký: {new Date(enrollment.enrolledAt).toLocaleDateString('vi-VN')}
                              {enrollment.startDate && ` • Bắt đầu: ${new Date(enrollment.startDate).toLocaleDateString('vi-VN')}`}
                              {enrollment.endDate && ` • Kết thúc: ${new Date(enrollment.endDate).toLocaleDateString('vi-VN')}`}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === 'enrollment' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Ghi danh</h3>
              </div>
              <div className="border-t border-slate-200">
                {student.enrollments.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có ghi danh nào</h3>
                    <p className="mt-1 text-sm text-slate-500">Đăng ký học viên vào khóa học.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {student.enrollments.map((enrollment) => (
                      <li key={enrollment.id} className="px-4 py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {enrollment.course.name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {enrollment.course.code}
                              {enrollment.class && ` • ${enrollment.class.code}`}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              Trạng thái: {enrollment.status}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-500">
                              {new Date(enrollment.enrolledAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        </div>
                        {enrollment.events.length > 0 && (
                          <div className="mt-3 ml-4 pl-4 border-l-2 border-slate-200">
                            <h4 className="text-sm font-medium text-slate-900 mb-2">Lịch sử sự kiện:</h4>
                            {enrollment.events.map((event) => (
                              <div key={event.id} className="text-sm text-slate-600 mb-1">
                                • {event.type} - {new Date(event.effectiveDate).toLocaleDateString('vi-VN')}
                                {event.reason && ` (${event.reason})`}
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Chuyên cần</h3>
              </div>
              <div className="border-t border-slate-200">
                {student.attendances.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có dữ liệu chuyên cần</h3>
                    <p className="mt-1 text-sm text-slate-500">Điểm danh sẽ hiển thị khi có buổi học.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {student.attendances.map((attendance) => {
                      const status = getAttendanceStatus(attendance.status);
                      const StatusIcon = status.icon;
                      return (
                        <li key={attendance.id} className="px-4 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
                                  <StatusIcon className="h-4 w-4" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-slate-900">
                                  {attendance.session.class.code}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {new Date(attendance.session.date).toLocaleDateString('vi-VN')}
                                </div>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color} bg-opacity-10`}>
                              {status.label}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Kết quả học tập</h3>
              </div>
              <div className="border-t border-slate-200">
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có kết quả học tập</h3>
                  <p className="mt-1 text-sm text-slate-500">Điểm số và đánh giá sẽ hiển thị khi có bài kiểm tra.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Học phí</h3>
              </div>
              <div className="border-t border-slate-200">
                {student.receivables.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có dữ liệu học phí</h3>
                    <p className="mt-1 text-sm text-slate-500">Học phí sẽ hiển thị khi có khoản phải thu.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {student.receivables.map((receivable) => (
                      <li key={receivable.id} className="px-4 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {receivable.course.name}
                            </div>
                            <div className="text-sm text-slate-500">
                              Tổng tiền: {receivable.totalAmount.toLocaleString('vi-VN')} VNĐ
                            </div>
                            {receivable.dueDate && (
                              <div className="text-sm text-slate-500">
                                Hạn: {new Date(receivable.dueDate).toLocaleDateString('vi-VN')}
                              </div>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            receivable.status === 'paid' ? 'bg-green-100 text-green-800' :
                            receivable.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            receivable.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {receivable.status === 'paid' ? 'Đã thanh toán' :
                             receivable.status === 'overdue' ? 'Quá hạn' :
                             receivable.status === 'partial' ? 'Thanh toán một phần' :
                             receivable.status === 'pending' ? 'Chờ thanh toán' :
                             receivable.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === 'warnings' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Cảnh báo</h3>
              </div>
              <div className="border-t border-slate-200">
                {student.warnings.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Không có cảnh báo nào</h3>
                    <p className="mt-1 text-sm text-slate-500">Cảnh báo sẽ hiển thị khi có vấn đề về học tập.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {student.warnings.map((warning) => (
                      <li key={warning.id} className="px-4 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            </div>
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="text-sm font-medium text-slate-900">
                              {getWarningTypeLabel(warning.type)}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {new Date(warning.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                            {warning.details && (
                              <div className="mt-1 text-sm text-slate-900">
                                {warning.details}
                              </div>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            warning.status === 'new' ? 'bg-red-100 text-red-800' :
                            warning.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            warning.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {warning.status === 'new' ? 'Mới' :
                             warning.status === 'processing' ? 'Đang xử lý' :
                             warning.status === 'resolved' ? 'Đã giải quyết' :
                             warning.status === 'contacted' ? 'Đã liên hệ' :
                             warning.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Tệp đính kèm</h3>
              </div>
              <div className="border-t border-slate-200">
                <div className="text-center py-12">
                  <Upload className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có tệp đính kèm nào</h3>
                  <p className="mt-1 text-sm text-slate-500">Tải lên chứng từ, tài liệu liên quan đến học viên.</p>
                  <button className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
                    <Upload className="mr-2 h-4 w-4" />
                    Tải lên tệp
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'changes' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Lịch sử thay đổi</h3>
              </div>
              <div className="border-t border-slate-200">
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">Lịch sử thay đổi</h3>
                  <p className="mt-1 text-sm text-slate-500">Audit log sẽ được triển khai trong Phase J.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
