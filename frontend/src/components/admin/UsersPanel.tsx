'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Eye, EyeOff, KeyRound } from 'lucide-react';
import { authHeaders, API_URL } from '@/lib/utils';

const ALL_ROLES = ['admin', 'manager', 'sales', 'academic', 'teacher', 'accountant'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị', manager: 'Quản lý', sales: 'Tư vấn',
  academic: 'Đào tạo', teacher: 'Giáo viên', accountant: 'Kế toán',
};

export default function UsersPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', phone: '', password: '', roles: [] as string[] });
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const res = await fetch(`${API_URL}/api/admin/users`, { headers: authHeaders() });
    if (res.ok) {
      const d = await res.json();
      setUsers(d.data || []);
    }
    setLoading(false);
  };

  const toggleRole = (r: string) => {
    setForm({ ...form, roles: form.roles.includes(r) ? form.roles.filter(x => x !== r) : [...form.roles, r] });
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API_URL}/api/admin/users`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ email: '', name: '', phone: '', password: '', roles: [] });
      fetchUsers();
    } else {
      const d = await res.json();
      setError(d.error || 'Tạo tài khoản thất bại');
    }
  };

  const toggleActive = async (u: any) => {
    await fetch(`${API_URL}/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    fetchUsers();
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetId) return;
    const res = await fetch(`${API_URL}/api/admin/users/${resetId}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: resetPassword }),
    });
    if (res.ok) {
      setResetId(null);
      setResetPassword('');
    } else {
      const d = await res.json();
      setError(d.error || 'Đặt lại mật khẩu thất bại');
    }
  };

  if (loading) return <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-600">{users.length} người dùng</p>
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700">
          <Plus className="h-4 w-4 mr-1" /> Tạo tài khoản
        </button>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={createUser} className="mb-6 bg-brand-50 border border-brand-200 rounded-lg p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-600">Email *</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-600">Họ tên *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-600">Điện thoại</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-600">Mật khẩu * (≥6 ký tự)</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-600 mb-1">Vai trò *</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map(r => (
                <button type="button" key={r} onClick={() => toggleRole(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    form.roles.includes(r) ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
                  }`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={form.roles.length === 0}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-50">Tạo</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm">Hủy</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
        <ul className="divide-y divide-slate-200">
          {users.map((u) => (
            <li key={u.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{u.name}</span>
                    {u.roles.map((r: string) => (
                      <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                        {ROLE_LABELS[r] || r}
                      </span>
                    ))}
                    {!u.isActive && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">Vô hiệu</span>}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{u.email}{u.phone && ` • ${u.phone}`}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setResetId(u.id); setResetPassword(''); }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200">
                    <KeyRound className="h-4 w-4 mr-1" /> Đặt lại MK
                  </button>
                  <button onClick={() => toggleActive(u)}
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg ${
                      u.isActive ? 'text-red-700 bg-red-50 hover:bg-red-100' : 'text-green-700 bg-green-50 hover:bg-green-100'
                    }`}>
                    {u.isActive ? <><EyeOff className="h-4 w-4 mr-1" /> Vô hiệu</> : <><Eye className="h-4 w-4 mr-1" /> Kích hoạt</>}
                  </button>
                </div>
              </div>
              {resetId === u.id && (
                <form onSubmit={submitReset} className="mt-3 flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <input type="password" required minLength={6} placeholder="Mật khẩu mới (≥6 ký tự)"
                    value={resetPassword} onChange={(e) => setResetPassword(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
                  <button type="submit" className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium">Lưu</button>
                  <button type="button" onClick={() => setResetId(null)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs">Hủy</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm text-slate-500">Chưa có người dùng nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
