'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { formatVND, formatDate } from '../finance/page';

interface Period {
  id: string;
  teacher: { id: string; code: string; name: string };
  periodStart: string;
  periodEnd: string;
  status: string;
  totalHours: number;
  totalAmount: number;
  _count: { items: number };
}

interface Teacher { id: string; code: string; name: string }

const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Nháp', color: 'bg-gray-100 text-gray-800' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Đã thanh toán', color: 'bg-green-100 text-green-800' },
};

export default function PayrollPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({ teacherId: '', periodStart: '', periodEnd: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [pRes, tRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/periods`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teachers`, { headers }),
      ]);
      if (pRes.ok) {
        const d = await pRes.json();
        setPeriods(d.data || []);
      }
      if (tRes.ok) {
        const d = await tRes.json();
        setTeachers(d.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/periods/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(genForm),
    });
    if (res.ok) {
      const period = await res.json();
      setShowGenerate(false);
      router.push(`/payroll/${period.id}`);
    } else {
      const d = await res.json();
      setError(d.error || 'Tạo bảng lương thất bại');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Đang tải...</div>;

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Bảng lương giáo viên</h1>
          <button
            onClick={() => setShowGenerate(!showGenerate)}
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" /> Tạo bảng lương
          </button>
        </div>

        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

        {showGenerate && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">
              Tạo bảng lương từ các buổi đã dạy (hệ thống tự tính giờ × đơn giá hiệu lực)
            </h3>
            <form onSubmit={generate} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-700">Giáo viên *</label>
                <select required value={genForm.teacherId}
                  onChange={(e) => setGenForm({ ...genForm, teacherId: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Từ ngày *</label>
                <input type="date" required value={genForm.periodStart}
                  onChange={(e) => setGenForm({ ...genForm, periodStart: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Đến ngày *</label>
                <input type="date" required value={genForm.periodEnd}
                  onChange={(e) => setGenForm({ ...genForm, periodEnd: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-4 flex gap-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                  Tạo bảng lương
                </button>
                <button type="button" onClick={() => setShowGenerate(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
          {periods.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Chưa có bảng lương nào</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {periods.map((p) => (
                <li key={p.id}
                  className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/payroll/${p.id}`)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{p.teacher.name}</span>
                        <span className="text-xs text-gray-500">({p.teacher.code})</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[p.status]?.color}`}>
                          {STATUS[p.status]?.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(p.periodStart)} → {formatDate(p.periodEnd)} • {p._count.items} mục
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatVND(p.totalAmount)}</p>
                      <p className="text-xs text-gray-500 flex items-center justify-end">
                        <Clock className="h-3 w-3 mr-1" /> {p.totalHours.toFixed(1)} giờ
                      </p>
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
