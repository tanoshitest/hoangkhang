'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, ArrowRightLeft } from 'lucide-react';
import { formatVND, formatDate } from '../page';

interface Adjustment {
  id: string;
  type: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
  receivable: {
    id: string;
    student: { code: string; name: string };
    course: { code: string; name: string };
  };
}

const TYPE_LABELS: Record<string, string> = {
  refund: 'Hoàn phí', transfer: 'Chuyển học phí', reserve: 'Bảo lưu',
  exemption: 'Miễn giảm', correction: 'Điều chỉnh',
};
const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Đã duyệt', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-800' },
};

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchAdjustments();
  }, [statusFilter]);

  const fetchAdjustments = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/adjustments${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const act = async (id: string, action: 'approve' | 'reject') => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/adjustments/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || 'Thao tác thất bại');
    }
    fetchAdjustments();
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <Link href="/finance" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại Tài chính
        </Link>
        <div className="mt-4 md:flex md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Điều chỉnh thanh toán</h1>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-4 md:mt-0 border border-gray-300 rounded-md px-3 py-1.5 text-sm">
            <option value="">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>

        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <p className="text-center py-8 text-sm text-gray-500">Đang tải...</p>
          ) : adjustments.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRightLeft className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Không có điều chỉnh nào</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {adjustments.map((a) => (
                <li key={a.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{TYPE_LABELS[a.type]}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[a.status]?.color}`}>
                          {STATUS[a.status]?.label}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{formatVND(a.amount)}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {a.receivable.student.name} ({a.receivable.student.code}) • {a.receivable.course.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{a.reason} • {formatDate(a.createdAt)}</p>
                    </div>
                    {a.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => act(a.id, 'approve')}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Duyệt
                        </button>
                        <button
                          onClick={() => act(a.id, 'reject')}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
