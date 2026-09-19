'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Play, Plus, ShieldCheck } from 'lucide-react';
import { formatVND } from '../finance/page';

interface Approval {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  detail?: string;
  payload?: any;
  status: string;
  createdAt: string;
  requester: { name: string };
  level1Name?: string;
  level2Name?: string;
}

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt cấp 1', color: 'bg-yellow-100 text-yellow-800' },
  level1_approved: { label: 'Chờ duyệt cấp 2', color: 'bg-brand-100 text-brand-800' },
  approved: { label: 'Đã duyệt', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-800' },
  executed: { label: 'Đã thực thi', color: 'bg-slate-100 text-slate-800' },
};

export default function ApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'promotion', title: '', detail: '' });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setRoles(JSON.parse(u).roles || []);
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/approvals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setItems((await res.json()).data || []);
    setLoading(false);
  };

  const act = async (id: string, action: string) => {
    const note = action === 'reject' ? window.prompt('Lý do từ chối:') : undefined;
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/approvals/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) { const d = await res.json(); alert(d.error); }
    fetchAll();
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/approvals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ type: 'promotion', title: '', detail: '' }); fetchAll(); }
  };

  const canL1 = roles.some(r => ['sales_leader', 'admin'].includes(r));
  const canL2 = roles.some(r => ['admin', 'manager'].includes(r));
  const canCreate = roles.some(r => ['sales', 'sales_leader', 'admin', 'manager'].includes(r));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;

  return (
    <div>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-end">
          {canCreate && (
            <button onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
              <Plus className="h-4 w-4 mr-1" /> Tạo đề xuất
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={create} className="mt-4 bg-white border border-slate-200 rounded-lg p-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Loại *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm">
                <option value="promotion">Chương trình ưu đãi</option>
                <option value="special_discount">Ghi nợ / giảm giá đặc biệt</option>
                <option value="data_delete">Xóa dữ liệu</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Tiêu đề *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Chi tiết</label>
              <textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} rows={3}
                className="mt-1 block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm" />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm">Hủy</button>
              <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm">Gửi duyệt</button>
            </div>
          </form>
        )}

        <div className="mt-4 bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
          <ul className="divide-y divide-slate-200">
            {items.map((a) => (
              <li key={a.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900">{a.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{a.typeLabel}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS[a.status]?.color}`}>
                        {STATUS[a.status]?.label}
                      </span>
                    </div>
                    {a.detail && <p className="mt-1 text-sm text-slate-600">{a.detail}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {a.requester.name} • {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                      {a.level1Name && ` • C1: ${a.level1Name}`}
                      {a.level2Name && ` • C2: ${a.level2Name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {a.status === 'pending' && canL1 && (
                      <button onClick={() => act(a.id, 'level1')} title="Duyệt cấp 1"
                        className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-brand-600 hover:bg-brand-700">
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Duyệt C1
                      </button>
                    )}
                    {a.status === 'level1_approved' && canL2 && (
                      <>
                        <button onClick={() => act(a.id, 'level2')} title="Duyệt cấp 2 (Giám đốc)"
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700">
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Duyệt C2
                        </button>
                      </>
                    )}
                    {a.status === 'approved' && canL2 && (
                      <button onClick={() => act(a.id, 'execute')}
                        className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-slate-800 hover:bg-slate-900">
                        <Play className="h-3.5 w-3.5 mr-1" /> Thực thi
                      </button>
                    )}
                    {['pending', 'level1_approved'].includes(a.status) && (canL1 || canL2) && (
                      <button onClick={() => act(a.id, 'reject')} title="Từ chối"
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-4 py-12 text-center text-sm text-slate-500">Chưa có đề xuất nào</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
