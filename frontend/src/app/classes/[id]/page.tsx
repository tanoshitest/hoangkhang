'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Calendar, User, Video, Plus, Clock, X } from 'lucide-react';

interface ClassDetail {
  id: string;
  code: string;
  format: string;
  startDate: string;
  endDate: string;
  maxStudents?: number;
  status: string;
  schedule?: string;
  meetingLink?: string;
  content?: string;
  course: {
    id: string;
    code: string;
    name: string;
    level: string;
    textbook?: string;
  };
  mainTeacher?: { id: string; name: string; phone: string };
  supportTeacher?: { id: string; name: string; phone: string };
  classMembers: Array<{
    id: string;
    status: string;
    joinedAt: string;
    student: { id: string; code: string; name: string; phone: string; status: string };
  }>;
  sessions: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    teacher: { id: string; name: string };
    _count: { attendances: number };
  }>;
}

interface StudentOption {
  id: string;
  code: string;
  name: string;
}

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchClass(params.id as string);
      fetchStudents();
    }
  }, [params.id]);

  const fetchClass = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setClassData(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch class:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students?limit=200`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) setStudents((await res.json()).data);
  };

  const addMember = async () => {
    if (!selectedStudent) return;
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/${params.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId: selectedStudent }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddMember(false);
        setSelectedStudent('');
        fetchClass(params.id as string);
      } else {
        setError(data.error || 'Failed to add student');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Xóa học viên khỏi lớp?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/${params.id}/members/${memberId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) fetchClass(params.id as string);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: 'bg-gray-100 text-gray-800',
      recruiting: 'bg-blue-100 text-blue-800',
      full: 'bg-yellow-100 text-yellow-800',
      studying: 'bg-green-100 text-green-800',
      paused: 'bg-orange-100 text-orange-800',
      finished: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  const sessionStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planned: 'Dự kiến',
      taught: 'Đã dạy',
      absent: 'Vắng',
      makeup: 'Học bù',
      rescheduled: 'Đổi lịch',
    };
    return labels[status] || status;
  };

  const activeMembers = classData?.classMembers.filter(m => m.status === 'active') || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-sm font-medium text-gray-900">Lớp không tồn tại</h3>
        <button
          onClick={() => router.push('/classes')}
          className="mt-4 inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/classes')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {classData.code} — {classData.course.name}
                </h1>
                <p className="text-sm text-gray-500 flex items-center space-x-3 mt-1">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(classData.startDate).toLocaleDateString('vi-VN')} → {new Date(classData.endDate).toLocaleDateString('vi-VN')}
                  </span>
                  {classData.schedule && <span>{classData.schedule}</span>}
                  {classData.meetingLink && (
                    <a href={classData.meetingLink} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                      <Video className="h-4 w-4 mr-1" />
                      Meeting
                    </a>
                  )}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(classData.status)}`}>
              {getStatusLabel(classData.status)}
            </span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Học viên</div>
            <div className="text-2xl font-semibold text-gray-900">
              {activeMembers.length}{classData.maxStudents ? `/${classData.maxStudents}` : ''}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Sessions</div>
            <div className="text-2xl font-semibold text-gray-900">{classData.sessions.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">GV chính</div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {classData.mainTeacher?.name || 'Chưa phân công'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">GV phụ</div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {classData.supportTeacher?.name || '—'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'members', name: `Học viên (${activeMembers.length})` },
              { id: 'sessions', name: `Sessions (${classData.sessions.length})` },
              { id: 'info', name: 'Thông tin' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Danh sách học viên</h3>
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Thêm HV
                </button>
              </div>
              {showAddMember && (
                <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
                  {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
                  <div className="flex gap-3">
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md py-2 px-3 text-sm"
                    >
                      <option value="">Chọn học viên</option>
                      {students
                        .filter(s => !activeMembers.some(m => m.student.id === s.id))
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                    <button
                      onClick={addMember}
                      disabled={!selectedStudent || submitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Đang thêm...' : 'Thêm'}
                    </button>
                  </div>
                </div>
              )}
              <ul className="divide-y divide-gray-200">
                {activeMembers.map((member) => (
                  <li key={member.id} className="px-4 py-4 flex items-center justify-between">
                    <div
                      className="cursor-pointer"
                      onClick={() => router.push(`/students/${member.student.id}`)}
                    >
                      <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {member.student.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.student.code} • {member.student.phone}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-400">
                        Vào {new Date(member.joinedAt).toLocaleDateString('vi-VN')}
                      </span>
                      <button
                        onClick={() => removeMember(member.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
                {activeMembers.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-gray-500">
                    Chưa có học viên nào trong lớp
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {classData.sessions.map((session) => (
                  <li key={session.id}>
                    <div
                      className="px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/sessions/${session.id}`)}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(session.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
                          </div>
                          <div className="text-sm text-gray-500">
                            {session.startTime}-{session.endTime} • {session.teacher.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500">
                          {session._count.attendances} điểm danh
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {sessionStatusLabel(session.status)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
                {classData.sessions.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-gray-500">
                    Chưa có session nào — tạo từ trang Lịch dạy
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Mã lớp</dt>
                    <dd className="mt-1 text-sm text-gray-900">{classData.code}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Khóa học</dt>
                    <dd className="mt-1 text-sm text-gray-900">{classData.course.name} ({classData.course.level})</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Hình thức</dt>
                    <dd className="mt-1 text-sm text-gray-900">{classData.format}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Giáo trình</dt>
                    <dd className="mt-1 text-sm text-gray-900">{classData.course.textbook || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Lịch học</dt>
                    <dd className="mt-1 text-sm text-gray-900">{classData.schedule || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nội dung</dt>
                    <dd className="mt-1 text-sm text-gray-900">{classData.content || '—'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
