'use client';

import { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatVND } from '../finance/page';

interface Commission {
  id: string;
  type: string;
  baseAmount: number;
  pct: number;
  amount: number;
  status: string;
  eligibleAt?: string;
  paidAt?: string;
  ctvName?: string;
  user?: { id: string; name: string } | null;
  enrollment: {
    status: string;
    billingType?: string;
    student: { name: string; code: string };
    course: { code: string; name: string };
  };
}

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ đủ điều kiện', color: 'bg-slate-100 text-slate-600' },
  eligible: { label: 'Đủ điều kiện chi', color: 'bg-brand-100 text-brand-800' },
  paid: { label: 'Đã chi', color: 'bg-green-100 text-green-800' },
  clawed_back: { label: 'Thu hồi', color: 'bg-red-100 text-red-800' },
};

const TYPE: Record<string, string> = {
  center_lead: 'Lead trung tâm (5%)',
  self_sourced: 'Sale tự tìm (10%)',
  ctv_referral: 'CTV giới thiệu (5%)',
};

export default function CommissionsPage() {
  const [items, setItems] = useState<Commission[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchAll(); }, [statusFilter]);

  const fetchAll = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const [c, w] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/commissions${statusFilter ? `?status=${statusFilter}` : ''}`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/commissions/clawback-check`, { headers }),
    ]);
    if (c.ok) setItems((await c.json()).data || []);
    if (w.ok) setAlerts((await w.json()).alerts || []);
    setLoading(false);
  };

  const checkEligibility = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/commissions/check-eligibility`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    fetchAll();
  };

  const pay = async (id: string) => {
    if (!confirm('Đánh dấu đã chi hoa hồng này?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/commissions/${id}/pay`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { const d = await res.json(); alert(d.error); }
    fetchAll();
  };

  const totalEligible = items.filter(i => i.status === 'eligible').reduce((s, i) => s + i.amount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={checkEligibility}
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
            <RefreshCw className="h-4 w-4 mr-1" /> Kiểm tra đủ điều kiện
          </button>
        </div>

        {alerts.length > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-800 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" /> Cảnh báo thu hồi hoa hồng
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              {alerts.map((a, i) => (
                <li key={i}>
                  <strong>{a.user?.name}</strong>: {a.suspendedCount} học viên bảo lưu —
                  đã chi {a.paidCommissions.length} khoản ({formatVND(a.paidCommissions.reduce((s: number, c: any) => s + c.amount, 0))})
                </li>
              ))}
            </ul>
          </div>
        )}

        {totalEligible > 0 && (
          <div className="mt-4 bg-brand-50 border border-brand-200 rounded-lg p-4 text-sm">
            Tổng chờ chi: <strong className="text-brand-700">{formatVND(totalEligible)}</strong>
          </div>
        )}

        <div className="mt-4 bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Sale / CTV</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Học viên / Khóa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Loại</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Căn cứ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Hoa hồng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">{c.user?.name || c.ctvName || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900">{c.enrollment.student.name}</div>
                    <div className="text-xs text-slate-500">{c.enrollment.course.code} • {c.enrollment.billingType === 'monthly' ? '1-1 (thu tháng)' : 'nhóm (thu block)'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{TYPE[c.type] || c.type}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">{formatVND(c.baseAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">{formatVND(c.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS[c.status]?.color}`}>
                      {STATUS[c.status]?.label || c.status}
                    </span>
                    {c.paidAt && <div className="text-xs text-slate-400 mt-0.5">{new Date(c.paidAt).toLocaleDateString('vi-VN')}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === 'eligible' && (
                      <button onClick={() => pay(c.id)}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" /> Chi
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  <DollarSign className="mx-auto h-10 w-10 text-slate-300 mb-2" />Chưa có hoa hồng nào
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
