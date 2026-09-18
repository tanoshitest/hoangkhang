'use client';

import { useState, useEffect, Fragment } from 'react';
import { Plus, Eye, EyeOff, KeyRound } from 'lucide-react';
import { authHeaders, API_URL } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';

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

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Danh sách người dùng ({users.length})</CardTitle>
          <CardDescription>Tài khoản đăng nhập và vai trò trong hệ thống.</CardDescription>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH className="w-10">#</TH>
              <TH>Họ tên</TH>
              <TH>Email</TH>
              <TH>SĐT</TH>
              <TH>Vai trò</TH>
              <TH>Trạng thái</TH>
              <TH className="text-right">Thao tác</TH>
            </TR>
          </THead>
          <TBody>
            {users.length === 0 ? (
              <EmptyRow colSpan={7}>Chưa có người dùng nào.</EmptyRow>
            ) : (
              users.map((u, index) => (
                <Fragment key={u.id}>
                  <TR>
                    <TD className="text-xs text-slate-400">{index + 1}</TD>
                    <TD className="font-medium text-slate-900 whitespace-nowrap">{u.name}</TD>
                    <TD className="whitespace-nowrap">{u.email}</TD>
                    <TD className="whitespace-nowrap">
                      {u.phone || <span className="text-slate-400">—</span>}
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r: string) => (
                          <Badge key={r} tone="brand">{ROLE_LABELS[r] || r}</Badge>
                        ))}
                      </div>
                    </TD>
                    <TD>
                      <Badge tone={u.isActive ? 'green' : 'slate'}>
                        {u.isActive ? 'Hoạt động' : 'Vô hiệu'}
                      </Badge>
                    </TD>
                    <TD className="w-px whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setResetId(u.id); setResetPassword(''); }}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200">
                          <KeyRound className="h-3.5 w-3.5 mr-1" /> Đặt lại MK
                        </button>
                        <button onClick={() => toggleActive(u)}
                          className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg ${
                            u.isActive ? 'text-red-700 bg-red-50 hover:bg-red-100' : 'text-green-700 bg-green-50 hover:bg-green-100'
                          }`}>
                          {u.isActive ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Vô hiệu</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Kích hoạt</>}
                        </button>
                      </div>
                    </TD>
                  </TR>
                  {resetId === u.id && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50 px-4 py-3">
                        <form onSubmit={submitReset} className="flex gap-2 items-center">
                          <input type="password" required minLength={6} placeholder="Mật khẩu mới (≥6 ký tự)"
                            value={resetPassword} onChange={(e) => setResetPassword(e.target.value)}
                            className="flex-1 max-w-xs border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
                          <button type="submit" className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium">Lưu</button>
                          <button type="button" onClick={() => setResetId(null)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs">Hủy</button>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
