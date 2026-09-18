'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, User, MessageSquare, Clock, CheckCircle, XCircle, Plus, UserCheck } from 'lucide-react';

interface Lead {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  zalo?: string;
  birthYear?: number;
  province?: string;
  educationLevel?: string;
  goal?: string;
  japanProgram?: string;
  availableTime?: string;
  source: string;
  status: string;
  interestedCourse?: string;
  expectedClass?: string;
  notRegisteredReason?: string;
  notes?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  activities: Array<{
    id: string;
    type: string;
    content: string;
    createdAt: string;
  }>;
  followUps: Array<{
    id: string;
    date: string;
    content: string;
    status: string;
  }>;
  trialTests: Array<{
    id: string;
    type: string;
    date: string;
    result?: string;
    notes?: string;
  }>;
  createdAt: string;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [showTrialForm, setShowTrialForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: 'call', content: '' });
  const [followUpForm, setFollowUpForm] = useState({ date: '', content: '' });
  const [trialForm, setTrialForm] = useState({ type: 'placement_test', date: '', result: '', notes: '' });

  useEffect(() => {
    if (params.id) {
      fetchLead(params.id as string);
    }
  }, [params.id]);

  const fetchLead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLead(data);
      }
    } catch (error) {
      console.error('Failed to fetch lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const authHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const submitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${params.id}/activities`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(activityForm),
      });
      if (res.ok) {
        setActivityForm({ type: 'call', content: '' });
        setShowActivityForm(false);
        fetchLead(params.id as string);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${params.id}/followups`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(followUpForm),
      });
      if (res.ok) {
        setFollowUpForm({ date: '', content: '' });
        setShowFollowUpForm(false);
        fetchLead(params.id as string);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${params.id}/trials`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(trialForm),
      });
      if (res.ok) {
        setTrialForm({ type: 'placement_test', date: '', result: '', notes: '' });
        setShowTrialForm(false);
        fetchLead(params.id as string);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const convertLead = async () => {
    if (!confirm('Chuyển lead này thành học viên?')) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${params.id}/convert`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/students/${data.student.id}`);
    } else {
      const err = await res.json();
      alert(err.error || 'Convert failed');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-brand-100 text-brand-800',
      assigned: 'bg-yellow-100 text-yellow-800',
      contacted: 'bg-purple-100 text-purple-800',
      consulting: 'bg-pink-100 text-pink-800',
      test_pending: 'bg-orange-100 text-orange-800',
      trial: 'bg-cyan-100 text-cyan-800',
      decision_pending: 'bg-green-100 text-green-800',
      registered: 'bg-green-100 text-green-800',
      not_registered: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'Mới',
      assigned: 'Đã phân công',
      contacted: 'Đã liên hệ',
      consulting: 'Đang tư vấn',
      test_pending: 'Chờ kiểm tra',
      trial: 'Học thử',
      decision_pending: 'Chờ quyết định',
      registered: 'Đã đăng ký',
      not_registered: 'Không đăng ký',
    };
    return labels[status] || status;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getFollowUpStatus = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'done': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-slate-900">Lead không tồn tại</h3>
        <button
          onClick={() => router.push('/leads')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
        >
          <ArrowLeft className="-ml-1 mr-2 h-5 w-5" />
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
                onClick={() => router.push('/leads')}
                className="mr-4 p-2 text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{lead.name}</h1>
                <p className="text-sm text-slate-500">{lead.code}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lead.status)}`}>
                {getStatusLabel(lead.status)}
              </span>
              {lead.status !== 'registered' && (
                <button
                  onClick={convertLead}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <UserCheck className="-ml-1 mr-2 h-4 w-4" />
                  Chuyển thành HV
                </button>
              )}
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
                <Edit className="-ml-1 mr-2 h-4 w-4" />
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Tổng quan' },
              { id: 'activities', name: 'Hoạt động' },
              { id: 'followups', name: 'Follow-up' },
              { id: 'trials', name: 'Kiểm tra/Học thử' },
              { id: 'history', name: 'Lịch sử' },
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

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Info */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">Thông tin cơ bản</h3>
                  </div>
                  <div className="border-t border-slate-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-slate-200">
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-slate-500">Họ tên</dt>
                        <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.name}</dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-slate-500">Điện thoại</dt>
                        <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.phone}</dd>
                      </div>
                      {lead.email && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Email</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.email}</dd>
                        </div>
                      )}
                      {lead.zalo && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Zalo</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.zalo}</dd>
                        </div>
                      )}
                      {lead.birthYear && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Năm sinh</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.birthYear}</dd>
                        </div>
                      )}
                      {lead.province && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Tỉnh/thành</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.province}</dd>
                        </div>
                      )}
                      {lead.educationLevel && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Trình độ quan tâm</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.educationLevel}</dd>
                        </div>
                      )}
                      {lead.goal && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Mục tiêu học</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.goal}</dd>
                        </div>
                      )}
                      {lead.japanProgram && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Chương trình đi Nhật</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.japanProgram}</dd>
                        </div>
                      )}
                      {lead.availableTime && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Lịch có thể học</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.availableTime}</dd>
                        </div>
                      )}
                      {lead.interestedCourse && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Khóa quan tâm</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.interestedCourse}</dd>
                        </div>
                      )}
                      {lead.expectedClass && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Lớp dự kiến</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.expectedClass}</dd>
                        </div>
                      )}
                      {lead.notRegisteredReason && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Lý do chưa đăng ký</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.notRegisteredReason}</dd>
                        </div>
                      )}
                      {lead.notes && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-slate-500">Ghi chú</dt>
                          <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{lead.notes}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>

              {/* Side Info */}
              <div className="space-y-6">
                {/* Source & Assignment */}
                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">Nguồn & Phân công</h3>
                  </div>
                  <div className="border-t border-slate-200 px-4 py-5">
                    <dl className="space-y-4">
                      <div>
                        <dt className="text-sm font-medium text-slate-500">Nguồn khách</dt>
                        <dd className="mt-1 text-sm text-slate-900">{lead.source}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-slate-500">Người phụ trách</dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {lead.assignedTo?.name || 'Chưa phân công'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-slate-500">Ngày nhận lead</dt>
                        <dd className="mt-1 text-sm text-slate-900">
                          {new Date(lead.createdAt).toLocaleDateString('vi-VN')}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">Thao tác nhanh</h3>
                  </div>
                  <div className="border-t border-slate-200 px-4 py-5 space-y-3">
                    <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                      <Phone className="mr-2 h-4 w-4" />
                      Gọi điện
                    </button>
                    <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Nhắn tin
                    </button>
                    <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700">
                      <Mail className="mr-2 h-4 w-4" />
                      Gửi email
                    </button>
                    <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700">
                      <Calendar className="mr-2 h-4 w-4" />
                      Đặt lịch hẹn
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Lịch sử trao đổi</h3>
                <button
                  onClick={() => setShowActivityForm(!showActivityForm)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Thêm
                </button>
              </div>
              {showActivityForm && (
                <form onSubmit={submitActivity} className="px-4 py-4 bg-slate-50 border-t border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                      value={activityForm.type}
                      onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                      className="border border-slate-300 rounded-lg py-2 px-3 text-sm"
                    >
                      <option value="call">Gọi điện</option>
                      <option value="message">Nhắn tin</option>
                      <option value="email">Email</option>
                      <option value="meeting">Gặp mặt</option>
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="Nội dung trao đổi..."
                      value={activityForm.content}
                      onChange={(e) => setActivityForm({ ...activityForm, content: e.target.value })}
                      className="md:col-span-2 border border-slate-300 rounded-lg py-2 px-3 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </form>
              )}
              <div className="border-t border-slate-200">
                {lead.activities.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có hoạt động nào</h3>
                    <p className="mt-1 text-sm text-slate-500">Bắt đầu ghi nhận trao đổi với lead.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {lead.activities.map((activity) => (
                      <li key={activity.id} className="px-4 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
                              {getActivityIcon(activity.type)}
                            </div>
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="text-sm text-slate-900">{activity.content}</div>
                            <div className="mt-1 text-sm text-slate-500">
                              {new Date(activity.createdAt).toLocaleString('vi-VN')}
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

          {activeTab === 'followups' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Lịch follow-up</h3>
                <button
                  onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Thêm
                </button>
              </div>
              {showFollowUpForm && (
                <form onSubmit={submitFollowUp} className="px-4 py-4 bg-slate-50 border-t border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="datetime-local"
                      required
                      value={followUpForm.date}
                      onChange={(e) => setFollowUpForm({ ...followUpForm, date: e.target.value })}
                      className="border border-slate-300 rounded-lg py-2 px-3 text-sm"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Nội dung follow-up..."
                      value={followUpForm.content}
                      onChange={(e) => setFollowUpForm({ ...followUpForm, content: e.target.value })}
                      className="md:col-span-2 border border-slate-300 rounded-lg py-2 px-3 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </form>
              )}
              <div className="border-t border-slate-200">
                {lead.followUps.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có lịch follow-up nào</h3>
                    <p className="mt-1 text-sm text-slate-500">Đặt lịch chăm sóc lead tiếp theo.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {lead.followUps.map((followUp) => (
                      <li key={followUp.id} className="px-4 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                              {getFollowUpStatus(followUp.status)}
                            </div>
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="text-sm text-slate-900">{followUp.content}</div>
                            <div className="mt-1 text-sm text-slate-500">
                              {new Date(followUp.date).toLocaleString('vi-VN')}
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

          {activeTab === 'trials' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Kiểm tra &amp; Học thử</h3>
                <button
                  onClick={() => setShowTrialForm(!showTrialForm)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Thêm
                </button>
              </div>
              {showTrialForm && (
                <form onSubmit={submitTrial} className="px-4 py-4 bg-slate-50 border-t border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={trialForm.type}
                      onChange={(e) => setTrialForm({ ...trialForm, type: e.target.value })}
                      className="border border-slate-300 rounded-lg py-2 px-3 text-sm"
                    >
                      <option value="placement_test">Kiểm tra đầu vào</option>
                      <option value="trial_class">Học thử</option>
                    </select>
                    <input
                      type="datetime-local"
                      required
                      value={trialForm.date}
                      onChange={(e) => setTrialForm({ ...trialForm, date: e.target.value })}
                      className="border border-slate-300 rounded-lg py-2 px-3 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Kết quả (vd: N4, 7.5/10)..."
                      value={trialForm.result}
                      onChange={(e) => setTrialForm({ ...trialForm, result: e.target.value })}
                      className="border border-slate-300 rounded-lg py-2 px-3 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Ghi chú..."
                      value={trialForm.notes}
                      onChange={(e) => setTrialForm({ ...trialForm, notes: e.target.value })}
                      className="border border-slate-300 rounded-lg py-2 px-3 text-sm"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </form>
              )}
              <div className="border-t border-slate-200">
                {lead.trialTests.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có kiểm tra/học thử nào</h3>
                    <p className="mt-1 text-sm text-slate-500">Ghi nhận kết quả kiểm tra đầu vào hoặc học thử.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {lead.trialTests.map((trial) => (
                      <li key={trial.id} className="px-4 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="text-sm font-medium text-slate-900">
                              {trial.type === 'placement_test' ? 'Kiểm tra đầu vào' : 'Học thử'}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {new Date(trial.date).toLocaleDateString('vi-VN')}
                            </div>
                            {trial.result && (
                              <div className="mt-1 text-sm text-slate-900">
                                Kết quả: {trial.result}
                              </div>
                            )}
                            {trial.notes && (
                              <div className="mt-1 text-sm text-slate-500">
                                Ghi chú: {trial.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-slate-900">Lịch sử thay đổi</h3>
              </div>
              <div className="border-t border-slate-200">
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">Lịch sử thay đổi</h3>
                  <p className="mt-1 text-sm text-slate-500">Chức năng audit log sẽ được triển khai sau.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
