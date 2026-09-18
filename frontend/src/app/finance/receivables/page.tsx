'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { buttonClass } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { EmptyRow, TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { authHeaders, cn, formatDate, formatVND } from '@/lib/utils';

interface Receivable {
  id: string;
  totalAmount: number;
  adjustedTotal: number;
  paidAmount: number;
  remaining: number;
  dueDate?: string | null;
  status: string;
  student: { id: string; code: string; name: string; phone?: string | null };
  course: { id: string; code: string; name: string };
}

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

const STATUS_FILTERS: Record<string, string> = {
  pending: 'Chưa thu',
  partial: 'Thu một phần',
  paid: 'Đã thu đủ',
  overdue: 'Quá hạn',
  cancelled: 'Đã hủy',
};

const DEBT_FILTERS: Record<string, string> = {
  owing: 'Công nợ cần thu',
  clear: 'Đã thu đủ',
};

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [courseId, setCourseId] = useState('');
  const [status, setStatus] = useState('');
  const [debt, setDebt] = useState('');

  useEffect(() => {
    const headers = authHeaders();
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/receivables`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses`, { headers }),
    ])
      .then(async ([receivablesRes, coursesRes]) => {
        if (receivablesRes.ok) setReceivables((await receivablesRes.json()).data);
        if (coursesRes.ok) setCourses((await coursesRes.json()).data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      receivables.filter((r) => {
        if (q) {
          const needle = q.toLowerCase();
          const hit =
            r.student.name.toLowerCase().includes(needle) ||
            r.student.code.toLowerCase().includes(needle) ||
            r.student.phone?.includes(q);
          if (!hit) return false;
        }
        if (courseId && r.course.id !== courseId) return false;
        if (status && r.status !== status) return false;
        if (debt === 'owing' && r.remaining <= 0) return false;
        if (debt === 'clear' && r.remaining > 0) return false;
        return true;
      }),
    [receivables, q, courseId, status, debt],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Card className="overflow-hidden">
        <CardHeader className="flex-col items-start gap-3">
          <div className="flex w-full items-start justify-between gap-4">
            <div>
              <CardTitle>Quản lý học phí ({filtered.length})</CardTitle>
              <CardDescription>
                Khoản phải thu theo học viên. Bấm vào số công nợ để xem chi tiết và thu tiếp.
              </CardDescription>
            </div>
            <Link href="/finance/receivables/new" className={buttonClass('primary', 'sm')}>
              <Plus className="h-4 w-4" />
              Tạo khoản phải thu
            </Link>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Tìm kiếm">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tên hoặc mã học viên, SĐT..."
              />
            </Field>
            <Field label="Khóa học">
              <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">Tất cả khóa học</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Trạng thái">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Tất cả</option>
                {Object.entries(STATUS_FILTERS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Công nợ" hint="Còn nợ: chưa thu đủ khoản phải thu.">
              <Select value={debt} onChange={(e) => setDebt(e.target.value)}>
                <option value="">Tất cả</option>
                {Object.entries(DEBT_FILTERS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardHeader>

        <Table>
          <THead>
            <TR>
              <TH className="w-10">#</TH>
              <TH>Mã HV</TH>
              <TH>Học viên</TH>
              <TH>Khóa học</TH>
              <TH className="text-right">Phải thu</TH>
              <TH className="text-right">Đã thu</TH>
              <TH className="text-right">Còn nợ</TH>
              <TH>Hạn đóng</TH>
              <TH>Trạng thái</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={9}>Không có khoản phải thu nào khớp bộ lọc.</EmptyRow>
            ) : (
              filtered.map((r, index) => (
                <TR key={r.id}>
                  <TD className="text-xs text-slate-400">{index + 1}</TD>
                  <TD className="whitespace-nowrap font-mono text-xs text-slate-500">
                    {r.student.code}
                  </TD>
                  <TD>
                    <Link
                      href={`/students/${r.student.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {r.student.name}
                    </Link>
                  </TD>
                  <TD className="whitespace-nowrap">{r.course.name}</TD>
                  <TD className="whitespace-nowrap text-right">{formatVND(r.adjustedTotal)}</TD>
                  <TD className="whitespace-nowrap text-right text-emerald-700">
                    {formatVND(r.paidAmount)}
                  </TD>
                  <TD className="whitespace-nowrap text-right">
                    <Link
                      href={`/finance/receivables/${r.id}`}
                      className={cn(
                        'font-medium hover:underline',
                        r.remaining > 0 ? 'text-red-600' : 'text-emerald-600',
                      )}
                    >
                      {r.remaining > 0 ? formatVND(r.remaining) : 'Đã thu đủ'}
                    </Link>
                  </TD>
                  <TD className="whitespace-nowrap text-slate-500">
                    {r.dueDate ? formatDate(r.dueDate) : '—'}
                  </TD>
                  <TD>
                    <StatusBadge value={r.status} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
