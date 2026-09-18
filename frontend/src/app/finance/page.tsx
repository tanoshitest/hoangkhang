'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, AlertTriangle, Clock, CheckCircle, Plus, FileText, ArrowRightLeft, Wallet } from 'lucide-react';

interface Summary {
  totalReceivable: number;
  totalCollected: number;
  totalRemaining: number;
  overdueCount: number;
  overdueAmount: number;
  pendingPayments: number;
  pendingAdjustments: number;
  receivableCount: number;
}

interface Receivable {
  id: string;
  student: { id: string; code: string; name: string };
  course: { code: string; name: string };
  totalAmount: number;
  adjustedTotal: number;
  paidAmount: number;
  remaining: number;
  dueDate: string | null;
  status: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chưa thu', color: 'bg-slate-100 text-slate-800' },
  partial: { label: 'Thu một phần', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Đã thu đủ', color: 'bg-green-100 text-green-800' },
  overdue: { label: 'Quá hạn', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Đã hủy', color: 'bg-slate-100 text-slate-500' },
};

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export default function FinancePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const params = statusFilter ? `?status=${statusFilter}` : '';

      const [sumRes, recRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/summary`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/receivables${params}`, { headers }),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (recRes.ok) {
        const data = await recRes.json();
        setReceivables(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Đang tải...</div>;
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="md:flex md:items-center md:justify-between">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Tài chính</h1>
          <Link
            href="/finance/receivables/new"
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Tạo khoản phải thu
          </Link>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden border border-slate-200 shadow-sm rounded-xl">
            <div className="p-5">
              <div className="flex items-center">
                <Wallet className="h-6 w-6 text-brand-500" />
                <div className="ml-5">
                  <p className="text-sm font-medium text-slate-500">Tổng phải thu</p>
                  <p className="text-lg font-semibold text-slate-900">{summary ? formatVND(summary.totalReceivable) : '-'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden border border-slate-200 shadow-sm rounded-xl">
            <div className="p-5">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div className="ml-5">
                  <p className="text-sm font-medium text-slate-500">Đã thu</p>
                  <p className="text-lg font-semibold text-green-600">{summary ? formatVND(summary.totalCollected) : '-'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden border border-slate-200 shadow-sm rounded-xl">
            <div className="p-5">
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-yellow-500" />
                <div className="ml-5">
                  <p className="text-sm font-medium text-slate-500">Còn nợ</p>
                  <p className="text-lg font-semibold text-yellow-600">{summary ? formatVND(summary.totalRemaining) : '-'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden border border-slate-200 shadow-sm rounded-xl">
            <div className="p-5">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div className="ml-5">
                  <p className="text-sm font-medium text-slate-500">Quá hạn ({summary?.overdueCount || 0})</p>
                  <p className="text-lg font-semibold text-red-600">{summary ? formatVND(summary.overdueAmount) : '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link href="/finance/receivables" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow text-center">
            <CreditCard className="h-6 w-6 mx-auto text-brand-500" />
            <p className="mt-2 text-sm font-medium text-slate-900">Khoản phải thu</p>
            <p className="text-xs text-slate-500">{summary?.receivableCount || 0} khoản</p>
          </Link>
          <Link href="/finance/payments" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow text-center">
            <FileText className="h-6 w-6 mx-auto text-green-500" />
            <p className="mt-2 text-sm font-medium text-slate-900">Giao dịch</p>
            <p className="text-xs text-slate-500">{summary?.pendingPayments || 0} chờ xác nhận</p>
          </Link>
          <Link href="/finance/debt" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow text-center">
            <AlertTriangle className="h-6 w-6 mx-auto text-red-500" />
            <p className="mt-2 text-sm font-medium text-slate-900">Công nợ</p>
            <p className="text-xs text-slate-500">{summary?.overdueCount || 0} quá hạn</p>
          </Link>
          <Link href="/finance/adjustments" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow text-center">
            <ArrowRightLeft className="h-6 w-6 mx-auto text-purple-500" />
            <p className="mt-2 text-sm font-medium text-slate-900">Điều chỉnh</p>
            <p className="text-xs text-slate-500">{summary?.pendingAdjustments || 0} chờ duyệt</p>
          </Link>
        </div>

        {/* Receivables list */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Khoản phải thu</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chưa thu</option>
              <option value="partial">Thu một phần</option>
              <option value="paid">Đã thu đủ</option>
              <option value="overdue">Quá hạn</option>
            </select>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
            {receivables.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-2 text-sm text-slate-500">Chưa có khoản phải thu nào</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {receivables.map((r) => (
                  <li
                    key={r.id}
                    className="px-4 py-4 sm:px-6 hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/finance/receivables/${r.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{r.student.name}</p>
                          <span className="text-xs text-slate-500">({r.student.code})</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[r.status]?.color || 'bg-slate-100'}`}>
                            {STATUS_LABELS[r.status]?.label || r.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{r.course.name}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium text-slate-900">
                          {formatVND(r.paidAmount)} / {formatVND(r.adjustedTotal)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.remaining > 0 ? `Còn nợ ${formatVND(r.remaining)}` : 'Đã hoàn tất'}
                          {r.dueDate && ` • Hạn ${formatDate(r.dueDate)}`}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
