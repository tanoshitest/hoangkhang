'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { formatVND } from '../../page';

interface Student { id: string; code: string; name: string }
interface Course { id: string; code: string; name: string; standardFee: number | null }

export default function NewReceivablePage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '', courseId: '',
    standardFee: '', discount: '0', scholarship: '0', extraFee: '0', dueDate: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, { headers }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses`, { headers }).then(r => r.json()),
    ]).then(([s, c]) => {
      setStudents(s.data || []);
      setCourses(c.data || []);
    });
  }, []);

  const total =
    (Number(form.standardFee) || 0) - (Number(form.discount) || 0) -
    (Number(form.scholarship) || 0) + (Number(form.extraFee) || 0);

  const selectCourse = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    setForm({ ...form, courseId, standardFee: course?.standardFee ? String(course.standardFee) : form.standardFee });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/receivables`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: form.studentId,
        courseId: form.courseId,
        standardFee: Number(form.standardFee),
        discount: Number(form.discount) || 0,
        scholarship: Number(form.scholarship) || 0,
        extraFee: Number(form.extraFee) || 0,
        dueDate: form.dueDate || undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/finance/receivables/${data.id}`);
    } else {
      const d = await res.json();
      setError(d.error || 'Tạo khoản phải thu thất bại');
      setSaving(false);
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
        <Link href="/finance" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại Tài chính
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Tạo khoản phải thu</h1>

        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Học viên *</label>
              <select
                required value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- Chọn học viên --</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Khóa học *</label>
              <select
                required value={form.courseId}
                onChange={(e) => selectCourse(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- Chọn khóa học --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Học phí chuẩn *</label>
              <input
                type="number" required min="0" value={form.standardFee}
                onChange={(e) => setForm({ ...form, standardFee: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Hạn thanh toán</label>
              <input
                type="date" value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Giảm giá</label>
              <input
                type="number" min="0" value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Học bổng</label>
              <input
                type="number" min="0" value={form.scholarship}
                onChange={(e) => setForm({ ...form, scholarship: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phụ phí</label>
              <input
                type="number" min="0" value={form.extraFee}
                onChange={(e) => setForm({ ...form, extraFee: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="bg-blue-50 rounded-md p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Tổng phải thu:</span>
            <span className={`text-xl font-bold ${total < 0 ? 'text-red-600' : 'text-blue-600'}`}>
              {formatVND(total)}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              type="submit" disabled={saving || !form.studentId || !form.courseId || total < 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Tạo khoản phải thu'}
            </button>
            <Link href="/finance" className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">
              Hủy
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
