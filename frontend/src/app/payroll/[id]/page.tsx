'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, DollarSign, Plus, Trash2, Clock } from 'lucide-react';
import { formatVND, formatDate } from '../../finance/page';

interface Item {
  id: string;
  type: string;
  date: string;
  hours: number;
  rate: number;
  amount: number;
  ratio?: number | null;
  revenuePerHour?: number | null;
  bonusType?: string | null;
  bonusAmount?: number | null;
  description: string | null;
  session: { class: { code: string } } | null;
}

interface Period {
  id: string;
  teacher: { id: string; code: string; name: string; phone: string };
  periodStart: string;
  periodEnd: string;
  status: string;
  totalHours: number;
  totalAmount: number;
  confirmedAt: string | null;
  paidAt: string | null;
  items: Item[];
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  teaching: { label: 'Giờ dạy', color: 'bg-brand-100 text-brand-800' },
  regular: { label: 'Buổi thường', color: 'bg-brand-100 text-brand-800' },
  makeup: { label: 'Dạy bù', color: 'bg-purple-100 text-purple-800' },
  substitute: { label: 'Dạy thay', color: 'bg-indigo-100 text-indigo-800' },
  bonus: { label: 'Thưởng', color: 'bg-green-100 text-green-800' },
  trial: { label: 'Học thử', color: 'bg-teal-100 text-teal-800' },
  cancelled: { label: 'Hủy lớp', color: 'bg-slate-100 text-slate-600' },
  adjustment: { label: 'Cộng/trừ', color: 'bg-yellow-100 text-yellow-800' },
};

const BONUS_LABELS: Record<string, string> = {
  retention: 'Giữ sĩ số', jlpt_pass: 'Đậu JLPT', referral: 'Giới thiệu HV',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Nháp', color: 'bg-slate-100 text-slate-800' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-brand-100 text-brand-800' },
  paid: { label: 'Đã thanh toán', color: 'bg-green-100 text-green-800' },
};

export default function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [period, setPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdj, setShowAdj] = useState(false);
  const [adjForm, setAdjForm] = useState({ amount: '', description: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPeriod();
  }, [id]);

  const fetchPeriod = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/periods/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPeriod(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/periods/${id}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'adjustment',
        amount: Number(adjForm.amount),
        description: adjForm.description,
      }),
    });
    if (res.ok) {
      setShowAdj(false);
      setAdjForm({ amount: '', description: '' });
      fetchPeriod();
    } else {
      const d = await res.json();
      setError(d.error || 'Thêm khoản thất bại');
    }
  };

  const deleteItem = async (itemId: string) => {
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/periods/${id}/items/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchPeriod();
  };

  const transition = async (action: 'confirm' | 'pay') => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/periods/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || 'Thao tác thất bại');
    }
    fetchPeriod();
  };

  if (loading) return <div className="flex justify-center items-center h-64">Đang tải...</div>;
  if (!period) return <div className="text-center py-12 text-slate-500">Không tìm thấy bảng lương</div>;

  const isDraft = period.status === 'draft';

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <Link href="/payroll" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại Bảng lương
        </Link>

        <div className="mt-4 md:flex md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {period.teacher.name} <span className="text-base font-normal text-slate-500">({period.teacher.code})</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Kỳ: {formatDate(period.periodStart)} → {formatDate(period.periodEnd)}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[period.status]?.color}`}>
                {STATUS_LABELS[period.status]?.label}
              </span>
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            {isDraft && (
              <>
                <button onClick={() => setShowAdj(!showAdj)}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50">
                  <Plus className="h-4 w-4 mr-1" /> Cộng/trừ
                </button>
                <button onClick={() => transition('confirm')}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
                  <CheckCircle className="h-4 w-4 mr-1" /> Xác nhận
                </button>
              </>
            )}
            {period.status === 'confirmed' && (
              <button onClick={() => transition('pay')}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                <DollarSign className="h-4 w-4 mr-1" /> Đánh dấu đã trả
              </button>
            )}
          </div>
        </div>

        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

        {/* Summary */}
        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
            <p className="text-sm text-slate-500 flex items-center"><Clock className="h-4 w-4 mr-1" /> Tổng giờ</p>
            <p className="text-xl font-bold tracking-tight text-slate-900 mt-1">{period.totalHours.toFixed(1)}h</p>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
            <p className="text-sm text-slate-500">Số mục</p>
            <p className="text-xl font-bold tracking-tight text-slate-900 mt-1">{period.items.length}</p>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
            <p className="text-sm text-slate-500 flex items-center"><DollarSign className="h-4 w-4 mr-1" /> Tổng tiền</p>
            <p className="text-xl font-bold tracking-tight text-brand-600 mt-1">{formatVND(period.totalAmount)}</p>
          </div>
        </div>

        {showAdj && isDraft && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-md font-medium text-slate-900 mb-4">Thêm khoản cộng/trừ (thưởng, phạt, điều chỉnh)</h3>
            <form onSubmit={addAdjustment} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm text-slate-700">Số tiền * (âm = trừ)</label>
                <input type="number" required value={adjForm.amount}
                  onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-700">Mô tả</label>
                <input type="text" value={adjForm.description}
                  onChange={(e) => setAdjForm({ ...adjForm, description: e.target.value })}
                  className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-3 flex gap-2">
                <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700">Thêm</button>
                <button type="button" onClick={() => setShowAdj(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm">Hủy</button>
              </div>
            </form>
          </div>
        )}

        {/* Items */}
        <div className="mt-8">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Chi tiết</h2>
          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
            {period.items.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-500">Không có mục nào trong kỳ này</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {period.items.map((item) => (
                  <li key={item.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_LABELS[item.type]?.color || 'bg-slate-100'}`}>
                          {TYPE_LABELS[item.type]?.label || item.type}
                        </span>
                        <span className="text-sm text-slate-900">{formatDate(item.date)}</span>
                        {item.session && (
                          <span className="text-xs text-slate-500">Lớp {item.session.class.code}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {item.bonusType && (
                          <span className="mr-1 text-green-700 font-medium">[{BONUS_LABELS[item.bonusType] || item.bonusType}]</span>
                        )}
                        {item.description || ''}
                        {item.hours > 0 && item.rate > 0 && ` • ${item.hours.toFixed(1)}h × ${formatVND(item.rate)}`}
                        {item.ratio != null && item.revenuePerHour != null &&
                          ` • ${item.hours.toFixed(1)}h × ${Math.round(item.ratio * 100)}% × ${formatVND(item.revenuePerHour)}/h`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${item.amount < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {item.amount < 0 ? '-' : ''}{formatVND(Math.abs(item.amount))}
                      </span>
                      {isDraft && (
                        <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
