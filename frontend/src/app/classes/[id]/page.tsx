'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Calendar, User, Video, Plus, Clock, X, Upload, Send } from 'lucide-react';

interface ClassDetail {
  id: string;
  code: string;
  format: string;
  classType?: string;
  shift?: string;
  startDate: string;
  endDate: string;
  minStudents?: number;
  maxStudents?: number;
  status: string;
  schedule?: string;
  meetingLink?: string;
  driveLink?: string;
  videoLink?: string;
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
  const [scores, setScores] = useState<any[]>([]);
  const [csvText, setCsvText] = useState('');
  const [importMsg, setImportMsg] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchClass(params.id as string);
      fetchStudents();
      fetchScores(params.id as string);
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

  const fetchScores = async (classId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assessments?classId=${classId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) setScores((await res.json()).data || []);
  };

  const importScores = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assessments/import`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: csvText }),
    });
    const data = await res.json();
    setImportMsg(
      res.ok
        ? `Nhập ${data.imported} bản ghi${data.errors?.length ? ` — ${data.errors.length} lỗi: ${data.errors.slice(0, 3).join('; ')}` : ''}`
        : data.error || 'Import thất bại'
    );
    fetchScores(params.id as string);
  };

  const sendScore = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assessments/${id}/send`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    fetchScores(params.id as string);
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
      planned: 'bg-slate-100 text-slate-800',
      reserved: 'bg-amber-100 text-amber-800',
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
      reserved: 'Giữ chỗ',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-sm font-medium text-slate-900">Lớp không tồn tại</h3>
        <button
          onClick={() => router.push('/classes')}
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
                onClick={() => router.push('/classes')}
                className="mr-4 p-2 text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {classData.code} — {classData.course.name}
                </h1>
                <p className="text-sm text-slate-500 flex items-center space-x-3 mt-1">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(classData.startDate).toLocaleDateString('vi-VN')} → {new Date(classData.endDate).toLocaleDateString('vi-VN')}
                  </span>
                  {classData.schedule && <span>{classData.schedule}</span>}
                  {classData.meetingLink && (
                    <a href={classData.meetingLink} target="_blank" rel="noopener noreferrer" className="flex items-center text-brand-600 hover:underline">
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="text-sm text-slate-500">Học viên</div>
            <div className="text-xl font-bold tracking-tight text-slate-900">
              {activeMembers.length}{classData.maxStudents ? `/${classData.maxStudents}` : ''}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="text-sm text-slate-500">Buổi học</div>
            <div className="text-xl font-bold tracking-tight text-slate-900">{classData.sessions.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="text-sm text-slate-500">GV chính</div>
            <div className="text-sm font-medium text-slate-900 mt-1">
              {classData.mainTeacher?.name || 'Chưa phân công'}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="text-sm text-slate-500">GV phụ</div>
            <div className="text-sm font-medium text-slate-900 mt-1">
              {classData.supportTeacher?.name || '—'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'members', name: `Học viên (${activeMembers.length})` },
              { id: 'sessions', name: `Sessions (${classData.sessions.length})` },
              { id: 'scores', name: 'Điểm số' },
              { id: 'info', name: 'Thông tin' },
            ].map((tab) => (
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

        <div className="mt-6">
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Danh sách học viên</h3>
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Thêm HV
                </button>
              </div>
              {showAddMember && (
                <div className="px-4 py-4 bg-slate-50 border-b border-slate-200">
                  {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
                  <div className="flex gap-3">
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg py-2 px-3 text-sm"
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
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                      {submitting ? 'Đang thêm...' : 'Thêm'}
                    </button>
                  </div>
                </div>
              )}
              <ul className="divide-y divide-slate-200">
                {activeMembers.map((member) => (
                  <li key={member.id} className="px-4 py-4 flex items-center justify-between">
                    <div
                      className="cursor-pointer"
                      onClick={() => router.push(`/students/${member.student.id}`)}
                    >
                      <div className="text-sm font-medium text-slate-900 hover:text-brand-600">
                        {member.student.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {member.student.code} • {member.student.phone}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-slate-400">
                        Vào {new Date(member.joinedAt).toLocaleDateString('vi-VN')}
                      </span>
                      <button
                        onClick={() => removeMember(member.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
                {activeMembers.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-slate-500">
                    Chưa có học viên nào trong lớp
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <ul className="divide-y divide-slate-200">
                {classData.sessions.map((session) => (
                  <li key={session.id}>
                    <div
                      className="px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                      onClick={() => router.push(`/sessions/${session.id}`)}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-brand-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">
                            {new Date(session.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
                          </div>
                          <div className="text-sm text-slate-500">
                            {session.startTime}-{session.endTime} • {session.teacher.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-slate-500">
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
                  <li className="px-4 py-8 text-center text-sm text-slate-500">
                    Chưa có session nào — tạo từ trang Lịch dạy
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Scores Tab */}
          {activeTab === 'scores' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 shadow-sm sm:rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Import điểm (CSV)</h3>
                <p className="text-xs text-slate-500 mb-2">
                  Header: <code className="bg-slate-100 px-1 rounded">student_code,type,date,score,max_score,jlpt_result,notes</code>
                  — type: quizizz/midterm/final/jlpt_real. Dán CSV từ Excel/Google Sheets.
                </p>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={4}
                  placeholder={'student_code,type,date,score,max_score\nHV0001,midterm,2026-09-15,7.5,10'}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono"
                />
                <div className="mt-2 flex items-center gap-3">
                  <button onClick={importScores} disabled={!csvText.trim()}
                    className="inline-flex items-center px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-50">
                    <Upload className="h-4 w-4 mr-1" /> Import
                  </button>
                  {importMsg && <span className="text-xs text-slate-600">{importMsg}</span>}
                </div>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Học viên</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Loại</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Ngày</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Điểm</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Kết quả</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Gửi HV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {scores.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-900">{s.student?.name} <span className="text-xs text-slate-400">{s.student?.code}</span></td>
                        <td className="px-4 py-2 text-xs text-slate-600">
                          {({ quizizz: 'Quizizz', midterm: 'Giữa khóa', final: 'Cuối khóa', jlpt_real: 'JLPT thật' } as Record<string, string>)[s.type] || s.type}
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-600">{new Date(s.date).toLocaleDateString('vi-VN')}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          {s.score != null ? `${s.score}${s.maxScore ? `/${s.maxScore}` : ''}` : '—'}
                          {s.percent != null && <span className="text-xs text-slate-400 ml-1">({Math.round(s.percent * 100)}%)</span>}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {s.passed === true && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Đạt</span>}
                          {s.passed === false && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Chưa đạt</span>}
                          {s.passed == null && <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {s.sentToStudent
                            ? <span className="text-xs text-green-600">Đã gửi</span>
                            : <button onClick={() => sendScore(s.id)} className="text-xs text-brand-600 hover:underline inline-flex items-center">
                                <Send className="h-3 w-3 mr-0.5" /> Gửi
                              </button>}
                        </td>
                      </tr>
                    ))}
                    {scores.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Chưa có điểm nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="bg-white border border-slate-200 shadow-sm sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Mã lớp</dt>
                    <dd className="mt-1 text-sm text-slate-900">{classData.code}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Khóa học</dt>
                    <dd className="mt-1 text-sm text-slate-900">{classData.course.name} ({classData.course.level})</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Hình thức lớp</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {classData.classType === 'one_on_one' ? 'Kèm 1-1' : 'Lớp nhóm'}
                      {classData.shift && ` • ${({ morning: 'Sáng 8-11h', afternoon: 'Chiều 14-16h', evening: 'Tối 19-21h' } as Record<string, string>)[classData.shift]}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Giáo trình</dt>
                    <dd className="mt-1 text-sm text-slate-900">{classData.course.textbook || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Lịch học</dt>
                    <dd className="mt-1 text-sm text-slate-900">{classData.schedule || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Sĩ số min / max</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {classData.minStudents ?? '—'} / {classData.maxStudents ?? '—'}
                      {classData.status === 'reserved' && classData.minStudents && activeMembers.length < classData.minStudents && (
                        <span className="ml-2 text-amber-600">(thiếu {classData.minStudents - activeMembers.length} HV để mở)</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Drive tài liệu</dt>
                    <dd className="mt-1 text-sm">
                      {classData.driveLink
                        ? <a href={classData.driveLink} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Mở Drive</a>
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Video học bù</dt>
                    <dd className="mt-1 text-sm">
                      {classData.videoLink
                        ? <a href={classData.videoLink} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Mở video</a>
                        : '—'}
                    </dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-sm font-medium text-slate-500">Nội dung</dt>
                    <dd className="mt-1 text-sm text-slate-900">{classData.content || '—'}</dd>
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
