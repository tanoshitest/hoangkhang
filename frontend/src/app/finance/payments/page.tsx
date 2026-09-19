'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Printer } from 'lucide-react';
import { formatVND, formatDate } from '../page';

interface Payment {
  id: string;
  code: string;
  amount: number;
  paymentDate: string;
  method: string;
  itemType: string;
  content: string | null;
  reference: string | null;
  status: string;
  sentToStudent: boolean;
  collector?: { name: string } | null;
  receivable: {
    student: { id: string; code: string; name: string };
    course: { code: string; name: string };
  };
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', e_wallet: 'Ví điện tử', deposit_credit: 'Trừ cọc', card: 'Thẻ', other: 'Khác',
};
const ITEM_LABELS: Record<string, string> = {
  deposit: 'Cọc giữ chỗ', tuition: 'Học phí', pdf_material: 'Giáo trình PDF', makeup_hours: 'Giờ bù', other: 'Khác',
};
const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Đã hủy', color: 'bg-slate-100 text-slate-500' },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: '', to: '', method: '', status: '' });

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/payments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalConfirmed = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);

  const printReceipt = async (id: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/payments/${id}/receipt.pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      alert('Không tạo được phiếu thu');
    }
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <Link href="/finance" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại Tài chính
        </Link>
        <div className="mt-4 flex items-center justify-end">
          <p className="text-sm text-slate-600">
            Tổng đã xác nhận: <span className="font-semibold text-green-600">{formatVND(totalConfirmed)}</span>
          </p>
        </div>

        <div className="mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs text-slate-500">Từ ngày</label>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Đến ngày</label>
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Phương thức</label>
            <select value={filters.method} onChange={(e) => setFilters({ ...filters, method: e.target.value })}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">Tất cả</option>
              {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Trạng thái</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">Tất cả</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        <div className="mt-6 bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
          {loading ? (
            <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-2 text-sm text-slate-500">Không có giao dịch nào</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {payments.map((p) => (
                <li key={p.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{p.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[p.status]?.color}`}>
                          {STATUS[p.status]?.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                          {ITEM_LABELS[p.itemType] || p.itemType}
                        </span>
                        {p.sentToStudent && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Đã gửi HV</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {p.receivable.student.name} ({p.receivable.student.code}) • {p.receivable.course.name}
                        {p.content && ` • ${p.content}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{formatVND(p.amount)}</p>
                        <p className="text-xs text-slate-500">
                          {METHOD_LABELS[p.method] || p.method} • {formatDate(p.paymentDate)}
                          {p.collector?.name && ` • ${p.collector.name}`}
                        </p>
                      </div>
                      <button onClick={() => printReceipt(p.id)} title="In phiếu thu PDF"
                        className="p-2 text-slate-400 hover:text-brand-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
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
