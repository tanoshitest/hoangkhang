'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Users, Shield, Tag, Upload, FileText, Settings as SettingsIcon,
  Plus, Download, CheckCircle, XCircle, DollarSign, BookOpen,
} from 'lucide-react';
import UsersPanel from '@/components/admin/UsersPanel';

type Tab = 'users' | 'roles' | 'statuses' | 'import' | 'audit' | 'settings' | 'pricing' | 'teacher_rates';

const TABS: { id: Tab; name: string; icon: any }[] = [
  { id: 'users', name: 'Người dùng', icon: Users },
  { id: 'roles', name: 'Vai trò', icon: Shield },
  { id: 'statuses', name: 'Trạng thái', icon: Tag },
  { id: 'pricing', name: 'Bảng giá khóa', icon: BookOpen },
  { id: 'teacher_rates', name: 'Đơn giá GV', icon: DollarSign },
  { id: 'import', name: 'Nhập dữ liệu', icon: Upload },
  { id: 'audit', name: 'Nhật ký', icon: FileText },
  { id: 'settings', name: 'Tham số', icon: SettingsIcon },
];

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('users');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let roles: string[] = [];
    try {
      const userData = localStorage.getItem('user');
      roles = userData ? JSON.parse(userData).roles || [] : [];
    } catch {
      roles = [];
    }
    setIsAdmin(roles.includes('admin'));
  }, []);

  if (isAdmin === null) {
    return <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>;
  }

  if (!isAdmin) {
    return (
      <div className="py-6 max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">Bạn không có quyền truy cập trang này</p>
          <p className="text-sm text-yellow-600 mt-1">Chỉ tài khoản Quản trị viên mới xem được cấu hình hệ thống.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  tab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                <t.icon className="h-4 w-4 mr-1.5" /> {t.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {tab === 'users' && <UsersPanel />}
          {tab === 'roles' && <RolesTab />}
          {tab === 'statuses' && <StatusesTab />}
          {tab === 'pricing' && <CoursePricingTab />}
          {tab === 'teacher_rates' && <TeacherRatesTab />}
          {tab === 'import' && <ImportTab />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'settings' && <SettingsTab />}
        </div>
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

  if (loading) return <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((r) => (
        <div key={r.id} className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium text-slate-900">{r.displayName}</h3>
            <span className="text-xs text-slate-500">{r.userCount} người</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{r.description}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {r.permissions.map((p: string) => (
              <span key={p} className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{p}</span>
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
  const moduleLabels: Record<string, string> = {
    lead: 'KH tiềm năng', student: 'Học viên', class: 'Lớp học',
    session: 'Buổi học', payment: 'Thanh toán', warning: 'Cảnh báo',
  };

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

  if (loading) return <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">Tất cả phân hệ</option>
          {modules.map(m => <option key={m} value={m}>{moduleLabels[m] || m}</option>)}
        </select>
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700">
          <Plus className="h-4 w-4 mr-1" /> Thêm trạng thái
        </button>
      </div>

      {showForm && (
        <form onSubmit={createStatus} className="mb-6 bg-brand-50 border border-brand-200 rounded-lg p-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <label className="block text-xs text-slate-600">Phân hệ</label>
            <select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
              {modules.map(m => <option key={m} value={m}>{moduleLabels[m] || m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600">Mã trạng thái *</label>
            <input type="text" required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" placeholder="vd: vip" />
          </div>
          <div>
            <label className="block text-xs text-slate-600">Tên hiển thị *</label>
            <input type="text" required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-600">Màu</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="mt-1 block w-full h-8 border border-slate-300 rounded-lg" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm">Thêm</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Phân hệ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Tên hiển thị</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Hiển thị</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {statuses.map((s) => (
              <tr key={s.id} className={!s.isActive ? 'opacity-50' : ''}>
                <td className="px-4 py-3 text-sm text-slate-600">{moduleLabels[s.module] || s.module}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-900">{s.status}</td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  <span className="inline-flex items-center gap-1.5">
                    {s.color && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />}
                    {s.displayName}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{s.isSystem ? 'Hệ thống' : 'Tùy chỉnh'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(s)}
                    className={`text-xs font-medium ${s.isActive ? 'text-green-600' : 'text-slate-400'}`}>
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
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
        <h3 className="text-md font-medium text-slate-900 mb-4">Nhập dữ liệu từ CSV</h3>
        <div className="flex gap-4 mb-4">
          {(['leads', 'students'] as const).map(e => (
            <button key={e} onClick={() => { setEntity(e); setPreview(null); setResult(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                entity === e ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
              {e === 'leads' ? 'KH tiềm năng' : 'Học viên'}
            </button>
          ))}
        </div>

        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-4">
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
          <span className="text-sm text-slate-500">hoặc</span>
        </div>
        <textarea
          value={csv} onChange={(e) => setCsv(e.target.value)} rows={6}
          placeholder="Dán nội dung CSV vào đây..."
          className="mt-3 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
        />
        <div className="mt-3 flex gap-2">
          <button onClick={doPreview} disabled={!csv || loading}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Đang xử lý...' : 'Xem trước'}
          </button>
          {preview && preview.valid > 0 && (
            <button onClick={doCommit} disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">
              Nhập {preview.valid} dòng hợp lệ
            </button>
          )}
        </div>
      </div>

      {preview && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-slate-900 mb-3">
            Preview: {preview.valid} hợp lệ / {preview.total} dòng
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-slate-500">Dòng</th>
                  <th className="px-3 py-2 text-left text-xs text-slate-500">Tên</th>
                  <th className="px-3 py-2 text-left text-xs text-slate-500">SĐT</th>
                  <th className="px-3 py-2 text-left text-xs text-slate-500">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {preview.preview.map((p: any) => (
                  <tr key={p.row} className={!p.valid ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 text-slate-500">{p.row}</td>
                    <td className="px-3 py-2 text-slate-900">{p.data.name || '-'}</td>
                    <td className="px-3 py-2 text-slate-900">{p.data.phone || '-'}</td>
                    <td className="px-3 py-2">
                      {p.valid ? (
                        <span className="text-green-600 flex items-center text-xs"><CheckCircle className="h-3 w-3 mr-1" />Hợp lệ</span>
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
          <h3 className="text-md font-medium text-green-800">Nhập dữ liệu hoàn tất</h3>
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

const ENTITY_LABELS: Record<string, string> = {
  user: 'Người dùng', lead: 'KH tiềm năng', student: 'Học viên',
  payment: 'Thanh toán', status: 'Trạng thái', setting: 'Cấu hình',
  import: 'Nhập dữ liệu', session: 'Buổi học', class: 'Lớp học',
  receivable: 'Phải thu', adjustment: 'Điều chỉnh', payroll: 'Bảng lương',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Tạo', update: 'Cập nhật', delete: 'Xóa', import: 'Nhập',
  confirm: 'Xác nhận', cancel: 'Hủy', approve: 'Duyệt', reject: 'Từ chối',
  reset_password: 'Đặt lại mật khẩu', convert: 'Chuyển đổi', backup: 'Sao lưu',
  pay: 'Thanh toán', generate: 'Tạo',
};

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
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">Tất cả đối tượng</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
        {loading ? (
          <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-sm text-slate-500">Chưa có nhật ký nào</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {logs.map((log) => (
              <li key={log.id} className="px-4 py-3 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-900">
                      {log.user?.name || log.userId.slice(0, 8)}
                    </span>
                    <span className="text-sm text-slate-600 ml-2">
                      {ACTION_LABELS[log.action] || log.action} {ENTITY_LABELS[log.entity] || log.entity}
                    </span>
                    <span className="text-xs text-slate-400 ml-2 font-mono">{log.entityId.slice(0, 8)}</span>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ==================== COURSE PRICING (bảng giá khóa học) ====================

function CoursePricingTab() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState('');

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses`, { headers: authHeader() });
    if (res.ok) setCourses((await res.json()).data || []);
    setLoading(false);
  };

  const saveField = async (course: any, field: string, value: string) => {
    const num = value === '' ? null : Number(value);
    if (num !== null && isNaN(num)) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${course.id}`, {
      method: 'PUT',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: num }),
    });
    if (res.ok) { setSaved(course.id + field); setTimeout(() => setSaved(''), 1500); fetchCourses(); }
  };

  const numCell = (c: any, field: string) => (
    <td className="px-2 py-2" key={field}>
      <div className="flex items-center gap-1">
        <input type="number" defaultValue={c[field] ?? ''} min={0}
          onBlur={(e) => String(e.target.value) !== String(c[field] ?? '') && saveField(c, field, e.target.value)}
          className="w-24 border border-slate-300 rounded px-1.5 py-1 text-sm text-right" />
        {saved === c.id + field && <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
      </div>
    </td>
  );

  if (loading) return <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>;

  return (
    <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto sm:rounded-xl">
      <div className="px-4 py-3 border-b border-slate-200 text-xs text-slate-500">
        Đơn giá theo giờ học (VNĐ/giờ). Luyện thi = nền tảng cùng level. BJT đồng nhất mọi hình thức.
      </div>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Mã khóa</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Tên khóa</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">Giờ 1-1</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">Giờ nhóm</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">Block (giờ)</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">Giá 1-1</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">Giá nhóm 2-5</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">Giá nhóm 6-10</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">Giáo trình PDF</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {courses.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-3 py-2 text-sm font-mono font-medium text-slate-900">{c.code}</td>
              <td className="px-3 py-2 text-sm text-slate-700">{c.name}</td>
              {numCell(c, 'hoursOneOnOne')}
              {numCell(c, 'hoursGroup')}
              {numCell(c, 'blockHours')}
              {numCell(c, 'priceOneOnOne')}
              {numCell(c, 'priceGroup2to5')}
              {numCell(c, 'priceGroup6to10')}
              {numCell(c, 'pdfPrice')}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== TEACHER RATES (DON_GIA_GV) ====================

function TeacherRatesTab() {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState('');

  const LEVELS = ['N5-N4', 'N3', 'N2', 'BJT'];
  const STATUSES = [
    { key: 'probation', label: 'Thử việc' },
    { key: 'official', label: 'Chính thức' },
  ];

  useEffect(() => { fetchRates(); }, []);

  const fetchRates = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/teacher-rates`, { headers: authHeader() });
    if (res.ok) setRates((await res.json()).data || []);
    setLoading(false);
  };

  const globalRate = (level: string, status: string) =>
    rates.find(r => r.teacherId === null && r.level === level && r.employmentStatus === status);

  const saveRate = async (level: string, employmentStatus: string, value: string) => {
    const rate = Number(value);
    if (isNaN(rate) || rate < 0) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/teacher-rates`, {
      method: 'PUT',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, employmentStatus, rate }),
    });
    if (res.ok) { setSaved(level + employmentStatus); setTimeout(() => setSaved(''), 1500); fetchRates(); }
  };

  if (loading) return <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>;

  const overrides = rates.filter(r => r.teacherId !== null);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 shadow-sm sm:rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-md font-medium text-slate-900">Đơn giá giờ dạy lớp 1-1 (VNĐ/giờ)</h3>
          <p className="text-xs text-slate-500 mt-0.5">Lớp nhóm tính theo tỷ lệ doanh thu (xem Tham số: group_payroll_*). Đơn giá 0 = chưa nhập.</p>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Level giá</th>
              {STATUSES.map(s => (
                <th key={s.key} className="px-4 py-3 text-right text-xs font-medium text-slate-500">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {LEVELS.map(level => (
              <tr key={level}>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{level}</td>
                {STATUSES.map(s => {
                  const r = globalRate(level, s.key);
                  return (
                    <td key={s.key} className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <input type="number" min={0} defaultValue={r?.rate ?? 0}
                          onBlur={(e) => Number(e.target.value) !== (r?.rate ?? 0) && saveRate(level, s.key, e.target.value)}
                          className="w-28 border border-slate-300 rounded px-2 py-1 text-sm text-right" />
                        {saved === level + s.key && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {overrides.length > 0 && (
        <div className="bg-white border border-slate-200 shadow-sm sm:rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-md font-medium text-slate-900">Đơn giá riêng theo giáo viên</h3>
            <p className="text-xs text-slate-500 mt-0.5">Quản lý trong trang Giáo viên → chi tiết → Đơn giá</p>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <tbody className="divide-y divide-slate-200">
              {overrides.map(r => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-sm text-slate-900">{r.teacher?.name} ({r.teacher?.code})</td>
                  <td className="px-4 py-2 text-sm text-slate-500">{r.classType || '—'} / {r.role}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium">{new Intl.NumberFormat('vi-VN').format(r.rate)} đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== SETTINGS ====================

const SETTING_LABELS: Record<string, string> = {
  deposit_amount: 'Phí giữ chỗ / cọc (VNĐ)',
  discount_full_course: 'Giảm khi đóng full khóa',
  discount_relative: 'Giảm người thân/bạn bè',
  discount_ctv_enrolled: 'Giảm cho CTV có học',
  commission_ctv_not_enrolled: 'HH CTV không học',
  commission_center_lead: 'HH sale — lead trung tâm',
  commission_self_sourced: 'HH sale — lead tự tìm',
  bonus_retention: 'Thưởng GV giữ sĩ số (VNĐ/lớp)',
  bonus_jlpt_pass: 'Thưởng GV — HV đậu JLPT (VNĐ)',
  bonus_teacher_referral_pct: 'Thưởng GV giới thiệu HV (%)',
  excused_absence_per_month: 'Số nghỉ phép / tháng',
  absence_notice_hours: 'Báo nghỉ trước tối thiểu (giờ)',
  absence_warning_count: 'Cảnh báo vắng từ (buổi)',
  lead_dead_days: 'Lead chết sau (ngày)',
  group_min_students: 'Sĩ số min lớp nhóm',
  group_max_students: 'Sĩ số max lớp nhóm',
  tier_2_5_max: 'Khung 2-5 áp dụng đến sĩ số',
  reserve_months: 'Thời hạn bảo lưu (tháng)',
  sale_target_new_students: 'Target HV mới/tháng',
  clawback_suspend_count: 'Số HV bảo lưu → cảnh báo thu hồi HH',
  discount_cap: 'Trần tổng % giảm',
  pass_threshold: 'Ngưỡng đạt bài KT',
  lead_care_cycle_days: 'Chu kỳ nhắc chăm sóc lead (ngày)',
  group_payroll_floor_ratio: 'Lương nhóm — tỷ lệ sàn',
  group_payroll_extra_per_student: 'Lương nhóm — +%/HV vượt min',
  main_teachers_per_class: 'Số GV chính / lớp',
  receipt_prefix: 'Tiền tố số phiếu thu',
  pdf_material_price: 'Giá giáo trình PDF mặc định',
  org_name: 'Tên trung tâm (phiếu thu)',
  org_subtitle: 'Địa chỉ/MST (phiếu thu)',
};

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

  if (loading) return <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-medium text-slate-900">Cấu hình hệ thống</h3>
          <button onClick={downloadBackup}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
            <Download className="h-4 w-4 mr-1" /> Tải backup (JSON)
          </button>
        </div>

        <table className="min-w-full divide-y divide-slate-200">
          <tbody className="divide-y divide-slate-200">
            {settings.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2 w-64">
                  <div className="text-sm text-slate-900">{SETTING_LABELS[s.key] || s.key}</div>
                  {SETTING_LABELS[s.key] && <div className="text-xs text-slate-400 font-mono">{s.key}</div>}
                </td>
                <td className="px-3 py-2 text-sm text-slate-600 w-64">{s.description}</td>
                <td className="px-3 py-2">
                  <input
                    type="text" defaultValue={s.value}
                    onBlur={(e) => e.target.value !== s.value && saveSetting(s.key, e.target.value)}
                    className="block w-full border border-slate-300 rounded-lg px-2 py-1 text-sm"
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-3 py-2">
                <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)}
                  placeholder="key mới" className="block w-full border border-slate-300 rounded-lg px-2 py-1 text-sm" />
              </td>
              <td />
              <td className="px-3 py-2 flex gap-2">
                <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)}
                  placeholder="giá trị" className="block flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm" />
                <button onClick={() => { if (newKey) { saveSetting(newKey, newValue); setNewKey(''); setNewValue(''); } }}
                  className="px-3 py-1 bg-brand-600 text-white rounded-lg text-sm">Thêm</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
