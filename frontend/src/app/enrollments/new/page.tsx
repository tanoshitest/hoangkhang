'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, BookOpen, Calculator } from 'lucide-react';

interface Student { id: string; code: string; name: string }
interface Course {
  id: string; code: string; name: string; level: string;
  hoursOneOnOne?: number; hoursGroup?: number; blockHours?: number;
  priceOneOnOne?: number; priceGroup2to5?: number; priceGroup6to10?: number;
}
interface ClassOption {
  id: string; code: string; name?: string; courseId: string; status: string;
  classType?: string; currentStudents?: number; studyingStudents?: number; maxStudents?: number;
}
interface SaleUser { id: string; name: string }
interface FeePreview {
  classType: string; priceTier: string | null; billingType: string;
  totalHours: number; unitPrice: number; grossFee: number;
  discountPct: number; discountDetail: { type: string; pct: number }[];
  finalFee: number; depositApplied: number;
  periods: { periodType: string; periodLabel: string; amount: number }[];
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ';

const DISCOUNT_OPTIONS = [
  { type: 'full_course', label: 'Đóng full khóa (−20%)' },
  { type: 'relative', label: 'Người thân/bạn bè cùng học (−5%)' },
  { type: 'ctv', label: 'CTV giới thiệu & có học (−10%)' },
];

export default function NewEnrollmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sales, setSales] = useState<SaleUser[]>([]);
  const [preview, setPreview] = useState<FeePreview | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    studentId: '',
    courseId: '',
    classType: 'group' as 'group' | 'one_on_one',
    classId: '',
    priceTier: '',
    discounts: [] as string[],
    promoPct: 0,
    monthlyHours: 16,
    hasDeposit: true,
    saleId1: '',
    saleId2: '',
    leadType: 'center',
    ctvType: 'none',
    ctvName: '',
    startDate: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    const [s, c, cl, u] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students?limit=500`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/sales`, { headers }),
    ]);
    if (s.ok) setStudents((await s.json()).data);
    if (c.ok) setCourses((await c.json()).data);
    if (cl.ok) setClasses((await cl.json()).data);
    if (u.ok) setSales((await u.json()).data);
  };

  const course = courses.find(c => c.id === form.courseId);
  const filteredClasses = classes.filter(c => c.courseId === form.courseId && c.classType !== 'one_on_one');
  const selectedClass = classes.find(c => c.id === form.classId);
  const projectedSize = (selectedClass?.studyingStudents ?? selectedClass?.currentStudents ?? 0) + 1;
  const autoTier = form.classType === 'group' ? (projectedSize <= 5 ? '2-5' : '6-10') : null;

  const body = useMemo(() => ({
    courseId: form.courseId,
    classType: form.classType,
    classId: form.classId || null,
    priceTier: form.priceTier || null,
    discounts: form.classType === 'group'
      ? [...form.discounts.map(t => ({ type: t })), ...(form.promoPct > 0 ? [{ type: 'promo' }] : [])]
      : [],
    promoPct: form.promoPct / 100,
    monthlyHours: form.classType === 'one_on_one' ? form.monthlyHours : null,
    hasDeposit: form.hasDeposit,
    saleId1: form.saleId1 || null,
    saleId2: form.saleId2 || null,
    leadType: form.leadType,
    ctvType: form.ctvType,
    ctvName: form.ctvType !== 'none' ? form.ctvName : null,
    startDate: form.startDate || null,
  }), [form]);

  const doPreview = async () => {
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enrollments/preview`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) setPreview(data);
    else setError(data.error || 'Không tính được học phí');
  };

  useEffect(() => { setPreview(null); }, [body]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enrollments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, studentId: form.studentId }),
      });
      const data = await res.json();
      if (res.ok) router.push('/enrollments');
      else setError(data.error || 'Tạo ghi danh thất bại');
    } catch {
      setError('Lỗi kết nối mạng');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 text-sm';
  const labelCls = 'block text-sm font-medium text-slate-700';

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-6">
          <button onClick={() => router.push('/enrollments')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600" aria-label="Quay lại">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: form */}
          <div className="lg:col-span-3 bg-white border border-slate-200 shadow-sm sm:rounded-lg p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center">
              <BookOpen className="mr-2 h-5 w-5" /> Ghi danh mới
            </h3>

            <div>
              <label className={labelCls}>Học viên *</label>
              <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className={inputCls}>
                <option value="">Chọn học viên</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Khóa học *</label>
                <select required value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value, classId: '' })} className={inputCls}>
                  <option value="">Chọn khóa học</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Hình thức *</label>
                <select value={form.classType} onChange={(e) => setForm({ ...form, classType: e.target.value as any, classId: '', discounts: [] })} className={inputCls}>
                  <option value="group">Lớp nhóm (2-10)</option>
                  <option value="one_on_one">Kèm 1-1</option>
                </select>
              </div>
            </div>

            {form.classType === 'group' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Lớp</label>
                    <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} disabled={!form.courseId} className={`${inputCls} disabled:bg-slate-100`}>
                      <option value="">Chưa xếp lớp (Giữ chỗ)</option>
                      {filteredClasses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.studyingStudents ?? c.currentStudents ?? 0} HV
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Khung giá</label>
                    <select value={form.priceTier || autoTier || ''} onChange={(e) => setForm({ ...form, priceTier: e.target.value })} className={inputCls}>
                      <option value="2-5">Nhóm 2-5 HV{course?.priceGroup2to5 ? ` — ${fmt(course.priceGroup2to5)}/giờ` : ''}</option>
                      <option value="6-10">Nhóm 6-10 HV{course?.priceGroup6to10 ? ` — ${fmt(course.priceGroup6to10)}/giờ` : ''}</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">Khung giá chốt lúc ghi danh, không đổi khi sĩ số đổi</p>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Ưu đãi (cộng dồn, trần −20%)</label>
                  <div className="mt-2 space-y-2">
                    {DISCOUNT_OPTIONS.map(d => (
                      <label key={d.type} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={form.discounts.includes(d.type)}
                          onChange={(e) => setForm({ ...form, discounts: e.target.checked ? [...form.discounts, d.type] : form.discounts.filter(x => x !== d.type) })}
                          className="rounded border-slate-300 text-brand-600" />
                        {d.label}
                      </label>
                    ))}
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={form.promoPct > 0}
                        onChange={(e) => setForm({ ...form, promoPct: e.target.checked ? 5 : 0 })}
                        className="rounded border-slate-300 text-brand-600" />
                      Chương trình ưu đãi (đã duyệt):
                      <input type="number" min={0} max={20} value={form.promoPct || ''} disabled={form.promoPct === 0}
                        onChange={(e) => setForm({ ...form, promoPct: Math.min(20, Math.max(0, Number(e.target.value))) })}
                        className="w-16 border border-slate-300 rounded px-1.5 py-0.5 text-sm disabled:bg-slate-100" /> %
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className={labelCls}>Số giờ đăng ký / tháng *</label>
                <input type="number" required min={1} value={form.monthlyHours}
                  onChange={(e) => setForm({ ...form, monthlyHours: Number(e.target.value) })} className={inputCls} />
                <p className="mt-1 text-xs text-slate-500">Lớp 1-1 thu theo tháng, không có ưu đãi{course?.priceOneOnOne ? ` — ${fmt(course.priceOneOnOne)}/giờ` : ''}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Sale phụ trách 1</label>
                <select value={form.saleId1} onChange={(e) => setForm({ ...form, saleId1: e.target.value })} className={inputCls}>
                  <option value="">— Không có —</option>
                  {sales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Sale phụ trách 2 (chia HH)</label>
                <select value={form.saleId2} onChange={(e) => setForm({ ...form, saleId2: e.target.value })} className={inputCls}>
                  <option value="">— Không có —</option>
                  {sales.filter(s => s.id !== form.saleId1).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Loại lead</label>
                <select value={form.leadType} onChange={(e) => setForm({ ...form, leadType: e.target.value })} className={inputCls}>
                  <option value="center">Lead trung tâm (HH 5%)</option>
                  <option value="self_sourced">Sale tự tìm (HH 10%)</option>
                  <option value="ctv">CTV giới thiệu (HH 5%)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>CTV giới thiệu</label>
                <select value={form.ctvType} onChange={(e) => setForm({ ...form, ctvType: e.target.value })} className={inputCls}>
                  <option value="none">Không</option>
                  <option value="ctv_enrolled">CTV có đăng ký học</option>
                  <option value="ctv_not_enrolled">CTV không học (HH 5%)</option>
                </select>
              </div>
            </div>

            {form.ctvType !== 'none' && (
              <div>
                <label className={labelCls}>Tên CTV</label>
                <input type="text" value={form.ctvName} onChange={(e) => setForm({ ...form, ctvName: e.target.value })} className={inputCls} placeholder="Tên cộng tác viên giới thiệu" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Ngày bắt đầu học</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.hasDeposit} onChange={(e) => setForm({ ...form, hasDeposit: e.target.checked })} className="rounded border-slate-300 text-brand-600" />
                  Thu cọc giữ chỗ 500.000 đ (không hoàn, trừ vào học phí)
                </label>
              </div>
            </div>
          </div>

          {/* Right: fee preview */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 shadow-sm sm:rounded-lg p-6 sticky top-6">
              <h3 className="text-base font-semibold text-slate-900 flex items-center mb-4">
                <Calculator className="mr-2 h-5 w-5" /> Tính học phí
              </h3>

              <button type="button" onClick={doPreview} disabled={!form.courseId || (form.classType === 'one_on_one' && !form.monthlyHours)}
                className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 mb-4">
                Xem trước học phí
              </button>

              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

              {preview && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Hình thức</span><span className="font-medium">{preview.classType === 'group' ? `Nhóm ${preview.priceTier}` : '1-1'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tổng giờ</span><span className="font-medium">{preview.totalHours} giờ</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Đơn giá</span><span className="font-medium">{fmt(preview.unitPrice)}/giờ</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Học phí gốc</span><span className="font-medium">{fmt(preview.grossFee)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Ưu đãi</span><span className="font-medium text-green-600">−{Math.round(preview.discountPct * 100)}%</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="font-medium">Học phí sau giảm</span><span className="font-bold text-brand-600">{fmt(preview.finalFee)}</span></div>

                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-slate-500 mb-2">Lịch thu ({preview.billingType === 'block' ? 'theo block' : 'theo tháng'}):</p>
                    <ul className="space-y-1">
                      {preview.periods.map((p, i) => (
                        <li key={i} className="flex justify-between text-xs">
                          <span className={p.periodType === 'deposit' ? 'text-amber-600' : 'text-slate-600'}>{p.periodLabel}</span>
                          <span className="font-medium">{fmt(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => router.push('/enrollments')}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                  Hủy
                </button>
                <button type="submit" disabled={loading || !form.studentId || !form.courseId}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50">
                  <Save className="-ml-1 mr-2 h-4 w-4" />
                  {loading ? 'Đang lưu...' : 'Ghi danh'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
