'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Users, Shield, Tag, Upload, FileText, Settings as SettingsIcon,
  Plus, Download, Eye, EyeOff, CheckCircle, XCircle,
} from 'lucide-react';

type Tab = 'users' | 'roles' | 'statuses' | 'import' | 'audit' | 'settings';

const TABS: { id: Tab; name: string; icon: any }[] = [
  { id: 'users', name: 'Người dùng', icon: Users },
  { id: 'roles', name: 'Vai trò', icon: Shield },
  { id: 'statuses', name: 'Trạng thái', icon: Tag },
  { id: 'import', name: 'Import', icon: Upload },
  { id: 'audit', name: 'Audit Log', icon: FileText },
  { id: 'settings', name: 'Cấu hình', icon: SettingsIcon },
];

const ALL_ROLES = ['admin', 'manager', 'sales', 'academic', 'teacher', 'accountant'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị', manager: 'Quản lý', sales: 'Tư vấn',
  academic: 'Đào tạo', teacher: 'Giáo viên', accountant: 'Kế toán',
};

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('users');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const roles = userData ? JSON.parse(userData).roles || [] : [];
    setIsAdmin(roles.includes('admin'));
  }, []);

  if (isAdmin === null) {
    return <p className="text-center py-8 text-sm text-gray-500">Đang tải...</p>;
  }

  if (!isAdmin) {
    return (
      <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">Bạn không có quyền truy cập trang này</p>
          <p className="text-sm text-yellow-600 mt-1">Chỉ tài khoản Quản trị viên mới xem được cấu hình hệ thống.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Hệ thống</h1>

        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <t.icon className="h-4 w-4 mr-1.5" /> {t.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {tab === 'users' && <UsersTab />}
          {tab === 'roles' && <RolesTab />}
          {tab === 'statuses' && <StatusesTab />}
          {tab === 'import' && <ImportTab />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

// ==================== USERS ====================

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', phone: '', password: '', roles: [] as string[] });
  const [error, setError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, { headers: authHeader() });
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
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ email: '', name: '', phone: '', password: '', roles: [] });
      fetchUsers();
    } else {
      const d = await res.json();
      setError(d.error || 'Tạo user thất bại');
    }
  };

  const toggleActive = async (u: any) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    fetchUsers();
  };

  if (loading) return <p className="text-center py-8 text-sm text-gray-500">Đang tải...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">{users.length} người dùng</p>
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-1" /> Tạo tài khoản
        </button>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={createUser} className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-gray-600">Email *</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Họ tên *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Điện thoại</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Mật khẩu * (≥6 ký tự)</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Vai trò *</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map(r => (
                <button type="button" key={r} onClick={() => toggleRole(r)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                    form.roles.includes(r) ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'
                  }`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={form.roles.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50">Tạo</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm">Hủy</button>
          </div>
        </form>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.map((u) => (
            <li key={u.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{u.name}</span>
                  {u.roles.map((r: string) => (
                    <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {ROLE_LABELS[r] || r}
                    </span>
                  ))}
                  {!u.isActive && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Vô hiệu</span>}
                </div>
                <p className="text-sm text-gray-500 mt-1">{u.email}{u.phone && ` • ${u.phone}`}</p>
              </div>
              <button onClick={() => toggleActive(u)}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md ${
                  u.isActive ? 'text-red-700 bg-red-50 hover:bg-red-100' : 'text-green-700 bg-green-50 hover:bg-green-100'
                }`}>
                {u.isActive ? <><EyeOff className="h-4 w-4 mr-1" /> Vô hiệu</> : <><Eye className="h-4 w-4 mr-1" /> Kích hoạt</>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ==================== ROLES ====================

function RolesTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/roles`, { headers: authHeader() })
      .then(r => r.json()).then(d => { setRoles(d.data || []); setLoading(false); });
  }, []);

  if (loading) return <p className="text-center py-8 text-sm text-gray-500">Đang tải...</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((r) => (
        <div key={r.id} className="bg-white shadow rounded-lg p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium text-gray-900">{r.displayName}</h3>
            <span className="text-xs text-gray-500">{r.userCount} người</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{r.description}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {r.permissions.map((p: string) => (
              <span key={p} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{p}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== STATUSES ====================

function StatusesTab() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ module: 'lead', status: '', displayName: '', color: '#6B7280' });
  const modules = ['lead', 'student', 'class', 'session', 'payment', 'warning'];

  useEffect(() => { fetchStatuses(); }, [moduleFilter]);

  const fetchStatuses = async () => {
    const params = moduleFilter ? `?module=${moduleFilter}` : '';
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/statuses${params}`, { headers: authHeader() });
    if (res.ok) {
      const d = await res.json();
      setStatuses(d.data || []);
    }
    setLoading(false);
  };

  const createStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/statuses`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ ...form, status: '', displayName: '' });
      fetchStatuses();
    } else {
      const d = await res.json();
      alert(d.error || 'Tạo thất bại');
    }
  };

  const toggleActive = async (s: any) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/statuses/${s.id}`, {
      method: 'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    fetchStatuses();
  };

  if (loading) return <p className="text-center py-8 text-sm text-gray-500">Đang tải...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
          <option value="">Tất cả modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-1" /> Thêm status
        </button>
      </div>

      {showForm && (
        <form onSubmit={createStatus} className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <label className="block text-xs text-gray-600">Module</label>
            <select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600">Status key *</label>
            <input type="text" required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" placeholder="vd: vip" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Tên hiển thị *</label>
            <input type="text" required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Màu</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="mt-1 block w-full h-8 border border-gray-300 rounded-md" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm">Thêm</button>
          </div>
        </form>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Module</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tên hiển thị</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Hiển thị</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {statuses.map((s) => (
              <tr key={s.id} className={!s.isActive ? 'opacity-50' : ''}>
                <td className="px-4 py-3 text-sm text-gray-600">{s.module}</td>
                <td className="px-4 py-3 text-sm font-mono text-gray-900">{s.status}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <span className="inline-flex items-center gap-1.5">
                    {s.color && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />}
                    {s.displayName}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{s.isSystem ? 'Hệ thống' : 'Tùy chỉnh'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(s)}
                    className={`text-xs font-medium ${s.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                    {s.isActive ? 'Đang hiện' : 'Đang ẩn'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== IMPORT ====================

function ImportTab() {
  const [entity, setEntity] = useState<'leads' | 'students'>('leads');
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsv(ev.target?.result as string);
    reader.readAsText(file, 'utf-8');
  };

  const doPreview = async () => {
    if (!csv) return;
    setLoading(true);
    setResult(null);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/import/${entity}/preview`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    });
    if (res.ok) setPreview(await res.json());
    setLoading(false);
  };

  const doCommit = async () => {
    setLoading(true);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/import/${entity}/commit`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    });
    if (res.ok) {
      setResult(await res.json());
      setPreview(null);
      setCsv('');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Import dữ liệu từ CSV</h3>
        <div className="flex gap-4 mb-4">
          {(['leads', 'students'] as const).map(e => (
            <button key={e} onClick={() => { setEntity(e); setPreview(null); setResult(null); }}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                entity === e ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
              {e === 'leads' ? 'Leads' : 'Học viên'}
            </button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-600 mb-4">
          <p className="font-medium mb-1">Định dạng CSV (dòng đầu = header):</p>
          <code>
            {entity === 'leads'
              ? 'name,phone,email,source,goal,notes'
              : 'name,phone,email,birthdate,gender,address'}
          </code>
          <p className="mt-1">Hỗ trợ header tiếng Việt: ho_ten/ten, sdt/so_dien_thoai, nguon, muc_tieu, ghi_chu, ngay_sinh, gioi_tinh, dia_chi</p>
        </div>

        <div className="flex gap-3 items-center">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={loadFile} className="text-sm" />
          <span className="text-sm text-gray-500">hoặc</span>
        </div>
        <textarea
          value={csv} onChange={(e) => setCsv(e.target.value)} rows={6}
          placeholder="Dán nội dung CSV vào đây..."
          className="mt-3 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
        />
        <div className="mt-3 flex gap-2">
          <button onClick={doPreview} disabled={!csv || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50">
            {loading ? 'Đang xử lý...' : 'Xem trước'}
          </button>
          {preview && preview.valid > 0 && (
            <button onClick={doCommit} disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm disabled:opacity-50">
              Import {preview.valid} dòng hợp lệ
            </button>
          )}
        </div>
      </div>

      {preview && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-md font-medium text-gray-900 mb-3">
            Preview: {preview.valid} hợp lệ / {preview.total} dòng
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">Dòng</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">Tên</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">SĐT</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {preview.preview.map((p: any) => (
                  <tr key={p.row} className={!p.valid ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 text-gray-500">{p.row}</td>
                    <td className="px-3 py-2 text-gray-900">{p.data.name || '-'}</td>
                    <td className="px-3 py-2 text-gray-900">{p.data.phone || '-'}</td>
                    <td className="px-3 py-2">
                      {p.valid ? (
                        <span className="text-green-600 flex items-center text-xs"><CheckCircle className="h-3 w-3 mr-1" /> OK</span>
                      ) : (
                        <span className="text-red-600 flex items-center text-xs"><XCircle className="h-3 w-3 mr-1" /> {p.errors.join(', ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-md font-medium text-green-800">Import hoàn tất</h3>
          <p className="text-sm text-green-700 mt-1">
            Đã tạo {result.created} • Bỏ qua {result.skipped}
            {result.errors?.length > 0 && ` • ${result.errors.length} lỗi`}
          </p>
        </div>
      )}
    </div>
  );
}

// ==================== AUDIT ====================

function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => { fetchLogs(); }, [entityFilter]);

  const fetchLogs = async () => {
    const params = entityFilter ? `?entity=${entityFilter}` : '';
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/audit${params}`, { headers: authHeader() });
    if (res.ok) {
      const d = await res.json();
      setLogs(d.data || []);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-4">
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
          <option value="">Tất cả entities</option>
          {['user', 'lead', 'student', 'payment', 'status', 'setting', 'import'].map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <p className="text-center py-8 text-sm text-gray-500">Đang tải...</p>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-sm text-gray-500">Chưa có audit log nào</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {logs.map((log) => (
              <li key={log.id} className="px-4 py-3 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {log.user?.name || log.userId.slice(0, 8)}
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      {log.action} {log.entity}
                    </span>
                    <span className="text-xs text-gray-400 ml-2 font-mono">{log.entityId.slice(0, 8)}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ==================== SETTINGS ====================

function SettingsTab() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/settings`, { headers: authHeader() });
    if (res.ok) {
      const d = await res.json();
      setSettings(d.data || []);
    }
    setLoading(false);
  };

  const saveSetting = async (key: string, value: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/settings/${key}`, {
      method: 'PUT',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    fetchSettings();
  };

  const downloadBackup = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/backup`, { headers: authHeader() });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) return <p className="text-center py-8 text-sm text-gray-500">Đang tải...</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-medium text-gray-900">Cấu hình hệ thống</h3>
          <button onClick={downloadBackup}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
            <Download className="h-4 w-4 mr-1" /> Tải backup (JSON)
          </button>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="divide-y divide-gray-200">
            {settings.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2 text-sm font-mono text-gray-900 w-48">{s.key}</td>
                <td className="px-3 py-2 text-sm text-gray-600 w-64">{s.description}</td>
                <td className="px-3 py-2">
                  <input
                    type="text" defaultValue={s.value}
                    onBlur={(e) => e.target.value !== s.value && saveSetting(s.key, e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-3 py-2">
                <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)}
                  placeholder="key mới" className="block w-full border border-gray-300 rounded-md px-2 py-1 text-sm" />
              </td>
              <td />
              <td className="px-3 py-2 flex gap-2">
                <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)}
                  placeholder="giá trị" className="block flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm" />
                <button onClick={() => { if (newKey) { saveSetting(newKey, newValue); setNewKey(''); setNewValue(''); } }}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">Thêm</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
