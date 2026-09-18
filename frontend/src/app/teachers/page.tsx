'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';

interface Teacher {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  education?: string;
  certificates?: string;
  cooperationType: string;
  maxHoursPerWeek?: number;
  isActive: boolean;
  _count: { classesMain: number; sessions: number };
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    education: '',
    certificates: '',
    cooperationType: 'parttime',
    maxHoursPerWeek: '',
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teachers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) setTeachers((await response.json()).data);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teachers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          education: formData.education || undefined,
          certificates: formData.certificates || undefined,
          cooperationType: formData.cooperationType,
          maxHoursPerWeek: formData.maxHoursPerWeek ? parseInt(formData.maxHoursPerWeek) : undefined,
        }),
      });
      if (response.ok) {
        setShowForm(false);
        setFormData({ name: '', phone: '', email: '', education: '', certificates: '', cooperationType: 'parttime', maxHoursPerWeek: '' });
        fetchTeachers();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to create teacher');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase())
  );

  const coopLabel = (type: string) => {
    const labels: Record<string, string> = {
      fulltime: 'Toàn thời gian',
      parttime: 'Bán thời gian',
      freelance: 'Cộng tác viên',
    };
    return labels[type] || type;
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Quản lý giáo viên</h1>
            <p className="text-sm text-slate-500">Hồ sơ giáo viên và phân công giảng dạy</p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Thêm giáo viên
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="mt-6 bg-white border border-slate-200 shadow-sm sm:rounded-lg p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Thêm giáo viên mới</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Họ tên *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Điện thoại *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Hình thức hợp tác *</label>
                <select
                  value={formData.cooperationType}
                  onChange={(e) => setFormData({ ...formData, cooperationType: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="fulltime">Toàn thời gian</option>
                  <option value="parttime">Bán thời gian</option>
                  <option value="freelance">Cộng tác viên</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Học vấn</label>
                <input
                  type="text"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  placeholder="VD: Thạc sĩ Nhật ngữ"
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Chứng chỉ</label>
                <input
                  type="text"
                  value={formData.certificates}
                  onChange={(e) => setFormData({ ...formData, certificates: e.target.value })}
                  placeholder="VD: JLPT N1, Chứng chỉ sư phạm"
                  className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Giờ tối đa/tuần</label>
                <input
                  type="number"
                  value={formData.maxHoursPerWeek}
                  onChange={(e) => setFormData({ ...formData, maxHoursPerWeek: e.target.value })}
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
                  {submitting ? 'Đang lưu...' : 'Thêm giáo viên'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Teachers Table */}
        <Card className="mt-6 overflow-hidden">
          <CardHeader className="flex-col items-start gap-3">
            <div>
              <CardTitle>Danh sách giáo viên ({filtered.length})</CardTitle>
              <CardDescription>Bấm vào tên giáo viên để xem hồ sơ chi tiết.</CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã..."
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
                <TH>Giáo viên</TH>
                <TH>SĐT</TH>
                <TH>Email</TH>
                <TH>Hợp tác</TH>
                <TH className="text-center">Lớp</TH>
                <TH className="text-center">Buổi dạy</TH>
                <TH>Trạng thái</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.length === 0 ? (
                <EmptyRow colSpan={9}>Chưa có giáo viên nào.</EmptyRow>
              ) : (
                filtered.map((teacher, index) => (
                  <TR key={teacher.id}>
                    <TD className="text-xs text-slate-400">{index + 1}</TD>
                    <TD className="whitespace-nowrap font-mono text-xs text-slate-500">
                      {teacher.code}
                    </TD>
                    <TD>
                      <Link
                        href={`/teachers/${teacher.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {teacher.name}
                      </Link>
                    </TD>
                    <TD className="whitespace-nowrap">{teacher.phone}</TD>
                    <TD className="whitespace-nowrap">
                      {teacher.email || <span className="text-slate-400">—</span>}
                    </TD>
                    <TD>
                      <Badge tone="slate">{coopLabel(teacher.cooperationType)}</Badge>
                    </TD>
                    <TD className="text-center">{teacher._count?.classesMain ?? 0}</TD>
                    <TD className="text-center">{teacher._count?.sessions ?? 0}</TD>
                    <TD>
                      <Badge tone={teacher.isActive ? 'green' : 'slate'}>
                        {teacher.isActive ? 'Đang dạy' : 'Ngừng'}
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
