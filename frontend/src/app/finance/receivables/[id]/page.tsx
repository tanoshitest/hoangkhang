'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Plus, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { formatVND, formatDate } from '../../page';

interface Payment {
  id: string;
  code: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string | null;
  status: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
}

interface Adjustment {
  id: string;
  type: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
}

interface ReceivableDetail {
  id: string;
  student: { id: string; code: string; name: string; phone: string };
  course: { code: string; name: string };
  standardFee: number;
  discount: number;
  scholarship: number;
  extraFee: number;
  totalAmount: number;
  dueDate: string | null;
  status: string;
  adjustedTotal: number;
  paid: number;
  refunded: number;
  netPaid: number;
  remaining: number;
  payments: Payment[];
  adjustments: Adjustment[];
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  card: 'Thẻ',
  other: 'Khác',
};

const ADJ_TYPE_LABELS: Record<string, string> = {
  refund: 'Hoàn phí',
  transfer: 'Chuyển học phí',
  reserve: 'Bảo lưu',
  exemption: 'Miễn giảm',
  correction: 'Điều chỉnh',
};

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-500' },
};

const ADJ_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Đã duyệt', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-800' },
};

export default function ReceivableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ReceivableDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAdjForm, setShowAdjForm] = useState(false);
  const [error, setError] = useState('');

  const [paymentForm, setPaymentForm] = useState({
    amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'cash', reference: '',
  });
  const [adjForm, setAdjForm] = useState({ type: 'refund', amount: '', reason: '' });

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/receivables/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/receivables/${id}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
      }),
    });
    if (res.ok) {
      setShowPaymentForm(false);
      setPaymentForm({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'cash', reference: '' });
      fetchDetail();
    } else {
      const d = await res.json();
      setError(d.error || 'Tạo thanh toán thất bại');
    }
  };

  const confirmPayment = async (paymentId: string) => {
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/payments/${paymentId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchDetail();
  };

  const cancelPayment = async (paymentId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || 'Không thể hủy');
    }
    fetchDetail();
  };

  const submitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/receivables/${id}/adjustments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: adjForm.type, amount: Number(adjForm.amount), reason: adjForm.reason }),
    });
    if (res.ok) {
      setShowAdjForm(false);
      setAdjForm({ type: 'refund', amount: '', reason: '' });
      fetchDetail();
    } else {
      const d = await res.json();
      setError(d.error || 'Tạo điều chỉnh thất bại');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Đang tải...</div>;
  if (!data) return <div className="text-center py-12 text-gray-500">Không tìm thấy khoản phải thu</div>;

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <Link href="/finance" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại Tài chính
        </Link>

        <div className="mt-4 md:flex md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {data.student.name} <span className="text-base font-normal text-gray-500">({data.student.code})</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">{data.course.name} • Hạn: {formatDate(data.dueDate)}</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button
              onClick={() => setShowPaymentForm(true)}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" /> Ghi nhận thanh toán
            </button>
            <button
              onClick={() => setShowAdjForm(true)}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
            >
              Điều chỉnh
            </button>
          </div>
        </div>

        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

        {/* Amount breakdown */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Chi tiết khoản thu</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-sm text-gray-500">Học phí chuẩn</dt>
              <dd className="text-sm font-medium text-gray-900">{formatVND(data.standardFee)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Giảm giá / Học bổng</dt>
              <dd className="text-sm font-medium text-gray-900">-{formatVND(data.discount + data.scholarship)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Phụ phí</dt>
              <dd className="text-sm font-medium text-gray-900">+{formatVND(data.extraFee)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Tổng phải thu (sau điều chỉnh)</dt>
              <dd className="text-sm font-semibold text-blue-600">{formatVND(data.adjustedTotal)}</dd>
            </div>
          </dl>
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Đã thu{data.refunded > 0 ? ` (hoàn ${formatVND(data.refunded)})` : ''}</dt>
              <dd className="text-lg font-semibold text-green-600">{formatVND(data.netPaid)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Còn nợ</dt>
              <dd className={`text-lg font-semibold ${data.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatVND(data.remaining)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Trạng thái</dt>
              <dd className="text-sm font-medium text-gray-900 capitalize">{data.status}</dd>
            </div>
          </div>
        </div>

        {/* Payment form modal */}
        {showPaymentForm && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">Ghi nhận thanh toán</h3>
            <form onSubmit={submitPayment} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-sm text-gray-700">Số tiền *</label>
                <input
                  type="number" required min="1" value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder={String(data.remaining)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Ngày thanh toán</label>
                <input
                  type="date" value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Phương thức</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="bank_transfer">Chuyển khoản</option>
                  <option value="card">Thẻ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Mã tham chiếu</label>
                <input
                  type="text" value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-4 flex gap-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                  Lưu thanh toán
                </button>
                <button type="button" onClick={() => setShowPaymentForm(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Adjustment form */}
        {showAdjForm && (
          <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">Tạo điều chỉnh (hoàn phí / miễn giảm / điều chỉnh sai)</h3>
            <form onSubmit={submitAdjustment} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-sm text-gray-700">Loại</label>
                <select
                  value={adjForm.type}
                  onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {Object.entries(ADJ_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Số tiền *</label>
                <input
                  type="number" required value={adjForm.amount}
                  onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-700">Lý do *</label>
                <input
                  type="text" required value={adjForm.reason}
                  onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-4 flex gap-2">
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700">
                  Tạo điều chỉnh
                </button>
                <button type="button" onClick={() => setShowAdjForm(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payments list */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Lịch sử thanh toán</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {data.payments.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-500">Chưa có giao dịch nào</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {data.payments.map((p) => (
                  <li key={p.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{p.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS[p.status]?.color}`}>
                          {PAYMENT_STATUS[p.status]?.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatVND(p.amount)} • {METHOD_LABELS[p.method]} • {formatDate(p.paymentDate)}
                        {p.reference && ` • Ref: ${p.reference}`}
                      </p>
                    </div>
                    {p.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmPayment(p.id)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Xác nhận
                        </button>
                        <button
                          onClick={() => cancelPayment(p.id)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Hủy
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Adjustments list */}
        <div className="mt-8 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Điều chỉnh</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {data.adjustments.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-500">Chưa có điều chỉnh nào</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {data.adjustments.map((a) => (
                  <li key={a.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{ADJ_TYPE_LABELS[a.type]}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ADJ_STATUS[a.status]?.color}`}>
                        {ADJ_STATUS[a.status]?.label}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{formatVND(a.amount)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{a.reason} • {formatDate(a.createdAt)}</p>
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
