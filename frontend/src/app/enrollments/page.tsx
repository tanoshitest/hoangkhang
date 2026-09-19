'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, BookOpen, PauseCircle, PlayCircle, XCircle, CheckCircle } from 'lucide-react';
import { SalesTabs } from '@/components/SalesTabs';

interface Enrollment {
  id: string;
  code?: string;
  status: string;
  enrolledAt: string;
  classType?: string;
  priceTier?: string | null;
  billingType?: string;
  finalFee?: number;
  discountPct?: number;
  suspendUntil?: string | null;
  student: { id: string; code: string; name: string };
  course: { id: string; code: string; name: string };
  class?: { id: string; code: string } | null;
  sale1?: { id: string; name: string } | null;
  receivables?: { id: string; status: string; totalAmount: number; periodType?: string; periodLabel?: string }[];
}

const STATUS: Record<string, { label: string; color: string }> = {
  reserved: { label: 'Giữ chỗ', color: 'bg-yellow-100 text-yellow-800' },
  studying: { label: 'Đang học', color: 'bg-green-100 text-green-800' },
  suspended: { label: 'Bảo lưu', color: 'bg-blue-100 text-blue-800' },
  dropped: { label: 'Nghỉ học', color: 'bg-red-100 text-red-800' },
  completed: { label: 'Hoàn thành', color: 'bg-slate-100 text-slate-800' },
  enrolled: { label: 'Đã đăng ký', color: 'bg-brand-100 text-brand-800' },
};

const fmt = (n?: number) => (n === undefined ? '—' : new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ');

export default function EnrollmentsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchEnrollments(); }, [statusFilter]);

  const fetchEnrollments = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enrollments${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const doTransition = async (id: string, action: string) => {
    const reason = action === 'suspend' || action === 'drop' ? window.prompt('Lý do:') || '' : '';
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enrollments/${id}/transition`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    if (res.ok) fetchEnrollments();
    else {
      const d = await res.json();
      alert(d.error || 'Thất bại');
    }
  };

  const filtered = enrollments.filter(e =>
    !search ||
    e.student.name.toLowerCase().includes(search.toLowerCase()) ||
    e.student.code.toLowerCase().includes(search.toLowerCase()) ||
    (e.code || '').toLowerCase().includes(search.toLowerCase())
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <SalesTabs />
          </div>
          <button
            onClick={() => router.push('/enrollments/new')}
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="-ml-1 mr-1.5 h-4 w-4" />
            Ghi danh mới
          </button>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã HV, mã GD..."
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="mt-6 bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Mã GD / Học viên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Khóa / Lớp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Hình thức</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Học phí</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Công nợ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((e) => {
                const paid = (e.receivables || []).filter(r => r.status === 'paid').reduce((s, r) => s + r.totalAmount, 0);
                const total = (e.receivables || []).reduce((s, r) => s + r.totalAmount, 0);
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{e.student.name}</div>
                      <div className="text-xs text-slate-500">{e.code || e.id.slice(0, 8)} • {e.student.code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">{e.course.code}</div>
                      <div className="text-xs text-slate-500">{e.class?.code || 'Chưa xếp lớp'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {e.classType === 'one_on_one' ? '1-1' : `Nhóm ${e.priceTier || ''}`}
                      <div className="text-xs text-slate-400">{e.billingType === 'monthly' ? 'Thu tháng' : 'Thu block'}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-medium text-slate-900">{fmt(e.finalFee)}</div>
                      {(e.discountPct ?? 0) > 0 && <div className="text-xs text-green-600">−{Math.round((e.discountPct || 0) * 100)}%</div>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {total > 0 ? (
                        <span className={paid >= total ? 'text-green-600' : 'text-amber-600'}>
                          {fmt(paid)} / {fmt(total)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS[e.status]?.color || 'bg-slate-100'}`}>
                        {STATUS[e.status]?.label || e.status}
                      </span>
                      {e.suspendUntil && (
                        <div className="text-xs text-blue-600 mt-1">đến {new Date(e.suspendUntil).toLocaleDateString('vi-VN')}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {(e.status === 'studying' || e.status === 'reserved') && (
                          <button onClick={() => doTransition(e.id, 'suspend')} title="Bảo lưu (tối đa 3 tháng)"
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded">
                            <PauseCircle className="h-4 w-4" />
                          </button>
                        )}
                        {e.status === 'suspended' && (
                          <button onClick={() => doTransition(e.id, 'resume')} title="Nhập học lại"
                            className="p-1.5 text-slate-400 hover:text-green-600 rounded">
                            <PlayCircle className="h-4 w-4" />
                          </button>
                        )}
                        {['studying', 'reserved', 'suspended'].includes(e.status) && (
                          <>
                            <button onClick={() => doTransition(e.id, 'complete')} title="Hoàn thành"
                              className="p-1.5 text-slate-400 hover:text-green-600 rounded">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => doTransition(e.id, 'drop')} title="Nghỉ học"
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có ghi danh nào</h3>
              <p className="mt-1 text-sm text-slate-500">Bắt đầu bằng cách ghi danh học viên vào khóa học.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
