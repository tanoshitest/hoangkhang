'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Calendar, Clock, DollarSign } from 'lucide-react';
import { formatVND, formatDate } from '../../finance/page';

interface Availability { id: string; dayOfWeek: number; startTime: string; endTime: string }
interface Rate { id: string; classType: string | null; role: string; rate: number; effectiveFrom: string; effectiveTo: string | null }
interface ClassItem { id: string; code: string; status: string; course: { name: string; level: string | null } }
interface SessionItem { id: string; date: string; startTime: string; endTime: string; status: string; class: { code: string } }

interface Teacher {
  id: string; code: string; name: string; phone: string; email: string | null;
  education: string | null; certificates: string | null; cooperationType: string;
  maxHoursPerWeek: number | null; isActive: boolean;
  availability: Availability[]; rates: Rate[]; classesMain: ClassItem[]; sessions: SessionItem[];
}

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const COOP_LABELS: Record<string, string> = { fulltime: 'Toàn thời gian', parttime: 'Bán thời gian', freelance: 'Cộng tác viên' };
const ROLE_LABELS: Record<string, string> = { main: 'Chính', support: 'Phụ' };
const SESSION_STATUS: Record<string, string> = {
  planned: 'Dự kiến', taught: 'Đã dạy', absent: 'Vắng', makeup: 'Dạy bù',
  rescheduled: 'Dời lịch', teacher_changed: 'Đổi GV',
};

export default function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [showAvailForm, setShowAvailForm] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [availForm, setAvailForm] = useState({ dayOfWeek: '1', startTime: '18:00', endTime: '21:00' });
  const [rateForm, setRateForm] = useState({ classType: '', role: 'main', rate: '', effectiveFrom: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeacher();
  }, [id]);

  const fetchTeacher = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teachers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTeacher(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/availability`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: id, dayOfWeek: Number(availForm.dayOfWeek), startTime: availForm.startTime, endTime: availForm.endTime }),
    });
    if (res.ok) {
      setShowAvailForm(false);
      fetchTeacher();
    } else {
      const d = await res.json();
      setError(d.error || 'Thêm khung giờ thất bại');
    }
  };

  const deleteAvailability = async (slotId: string) => {
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/availability/${slotId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchTeacher();
  };

  const addRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/rates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: id,
        classType: rateForm.classType || undefined,
        role: rateForm.role,
        rate: Number(rateForm.rate),
        effectiveFrom: rateForm.effectiveFrom,
      }),
    });
    if (res.ok) {
      setShowRateForm(false);
      setRateForm({ classType: '', role: 'main', rate: '', effectiveFrom: '' });
      fetchTeacher();
    } else {
      const d = await res.json();
      setError(d.error || 'Thêm đơn giá thất bại');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Đang tải...</div>;
  if (!teacher) return <div className="text-center py-12 text-slate-500">Không tìm thấy giáo viên</div>;

  const tabs = [
    { id: 'info', name: 'Thông tin' },
    { id: 'availability', name: 'Khả dụng' },
    { id: 'rates', name: 'Đơn giá' },
    { id: 'classes', name: `Lớp (${teacher.classesMain.length})` },
    { id: 'sessions', name: 'Buổi dạy' },
  ];

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <Link href="/teachers" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại Giáo viên
        </Link>

        <div className="mt-4 md:flex md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {teacher.name} <span className="text-base font-normal text-slate-500">({teacher.code})</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {COOP_LABELS[teacher.cooperationType] || teacher.cooperationType}
              {teacher.maxHoursPerWeek && ` • Tối đa ${teacher.maxHoursPerWeek}h/tuần`}
              {!teacher.isActive && ' • Ngừng hoạt động'}
            </p>
          </div>
          <Link href="/payroll" className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
            <DollarSign className="h-4 w-4 mr-1" /> Bảng lương
          </Link>
        </div>

        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

        <div className="mt-6 border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'info' && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div><dt className="text-sm text-slate-500">Điện thoại</dt><dd className="text-sm font-medium text-slate-900">{teacher.phone}</dd></div>
                <div><dt className="text-sm text-slate-500">Email</dt><dd className="text-sm font-medium text-slate-900">{teacher.email || '-'}</dd></div>
                <div><dt className="text-sm text-slate-500">Trình độ</dt><dd className="text-sm font-medium text-slate-900">{teacher.education || '-'}</dd></div>
                <div><dt className="text-sm text-slate-500">Chứng chỉ</dt><dd className="text-sm font-medium text-slate-900">{teacher.certificates || '-'}</dd></div>
              </dl>
            </div>
          )}

          {activeTab === 'availability' && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">Khung giờ có thể dạy</h3>
                <button onClick={() => setShowAvailForm(!showAvailForm)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100">
                  <Plus className="h-4 w-4 mr-1" /> Thêm khung giờ
                </button>
              </div>

              {showAvailForm && (
                <form onSubmit={addAvailability} className="mb-4 bg-brand-50 rounded-lg p-4 grid grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-slate-600">Thứ</label>
                    <select value={availForm.dayOfWeek} onChange={(e) => setAvailForm({ ...availForm, dayOfWeek: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Từ</label>
                    <input type="time" value={availForm.startTime} onChange={(e) => setAvailForm({ ...availForm, startTime: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Đến</label>
                    <input type="time" value={availForm.endTime} onChange={(e) => setAvailForm({ ...availForm, endTime: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                  <button type="submit" className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm">Lưu</button>
                </form>
              )}

              {teacher.availability.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Chưa có khung giờ nào</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {teacher.availability.map((a) => (
                    <li key={a.id} className="py-3 flex items-center justify-between">
                      <span className="text-sm text-slate-900">
                        <span className="font-medium">{DAYS[a.dayOfWeek]}</span> • {a.startTime} - {a.endTime}
                      </span>
                      <button onClick={() => deleteAvailability(a.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'rates' && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">Đơn giá (lịch sử không bị ghi đè)</h3>
                <button onClick={() => setShowRateForm(!showRateForm)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100">
                  <Plus className="h-4 w-4 mr-1" /> Thêm đơn giá
                </button>
              </div>

              {showRateForm && (
                <form onSubmit={addRate} className="mb-4 bg-brand-50 rounded-lg p-4 grid grid-cols-2 gap-3 sm:grid-cols-5 items-end">
                  <div>
                    <label className="block text-xs text-slate-600">Loại lớp</label>
                    <select value={rateForm.classType} onChange={(e) => setRateForm({ ...rateForm, classType: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
                      <option value="">Tất cả</option>
                      <option value="online">Trực tuyến</option>
                      <option value="offline">Trực tiếp</option>
                      <option value="trial">Học thử</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Vai trò</label>
                    <select value={rateForm.role} onChange={(e) => setRateForm({ ...rateForm, role: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
                      <option value="main">Chính</option>
                      <option value="support">Phụ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Đơn giá/giờ *</label>
                    <input type="number" required min="1" value={rateForm.rate}
                      onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Hiệu lực từ *</label>
                    <input type="date" required value={rateForm.effectiveFrom}
                      onChange={(e) => setRateForm({ ...rateForm, effectiveFrom: e.target.value })}
                      className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                  <button type="submit" className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm">Lưu</button>
                </form>
              )}

              {teacher.rates.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Chưa có đơn giá nào</p>
              ) : (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Loại lớp</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Vai trò</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Đơn giá</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Hiệu lực</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {teacher.rates.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-sm text-slate-900">{r.classType || 'Tất cả'}</td>
                        <td className="px-3 py-2 text-sm text-slate-900">{ROLE_LABELS[r.role] || r.role}</td>
                        <td className="px-3 py-2 text-sm font-medium text-slate-900">{formatVND(r.rate)}/h</td>
                        <td className="px-3 py-2 text-sm text-slate-500">
                          {formatDate(r.effectiveFrom)} → {r.effectiveTo ? formatDate(r.effectiveTo) : 'nay'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
              {teacher.classesMain.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Chưa phụ trách lớp nào</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {teacher.classesMain.map((c) => (
                    <li key={c.id} className="py-3">
                      <Link href={`/classes/${c.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                        {c.code}
                      </Link>
                      <span className="text-sm text-slate-500 ml-2">{c.course.name} • {c.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
              {teacher.sessions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Chưa có buổi dạy nào</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {teacher.sessions.map((s) => (
                    <li key={s.id} className="py-3 flex items-center justify-between">
                      <div>
                        <Link href={`/sessions/${s.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                          {s.class.code}
                        </Link>
                        <span className="text-sm text-slate-500 ml-2">
                          {formatDate(s.date)} • {s.startTime}-{s.endTime}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{SESSION_STATUS[s.status] || s.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
