'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { formatVND, formatDate } from '../page';

interface Debt {
  id: string;
  student: { id: string; code: string; name: string; phone: string };
  course: { code: string; name: string };
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  dueDate: string | null;
  status: string;
  isOverdue: boolean;
  daysOverdue: number;
}

export default function DebtPage() {
  const router = useRouter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebt = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/finance/debt`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setDebts(data.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDebt();
  }, []);

  const overdue = debts.filter(d => d.isOverdue);
  const upcoming = debts.filter(d => !d.isOverdue);

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <Link href="/finance" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại Tài chính
        </Link>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">Công nợ</h1>

        {loading ? (
          <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>
        ) : (
          <>
            {overdue.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-medium text-red-600 flex items-center mb-3">
                  <AlertTriangle className="h-5 w-5 mr-2" /> Quá hạn ({overdue.length})
                </h2>
                <DebtList debts={overdue} onClick={(id) => router.push(`/finance/receivables/${id}`)} />
              </div>
            )}
            <div className="mt-6">
              <h2 className="text-base font-semibold text-slate-900 mb-3">Chưa đến hạn ({upcoming.length})</h2>
              {upcoming.length === 0 && overdue.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm">Không có công nợ nào</p>
              ) : (
                <DebtList debts={upcoming} onClick={(id) => router.push(`/finance/receivables/${id}`)} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DebtList({ debts, onClick }: { debts: Debt[]; onClick: (id: string) => void }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
      <ul className="divide-y divide-slate-200">
        {debts.map((d) => (
          <li key={d.id} className="px-4 py-4 sm:px-6 hover:bg-slate-50 cursor-pointer" onClick={() => onClick(d.id)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{d.student.name}</span>
                  <span className="text-xs text-slate-500">({d.student.code})</span>
                  {d.isOverdue && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Quá hạn {d.daysOverdue} ngày
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {d.course.name} • {d.student.phone}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-600">Nợ {formatVND(d.remaining)}</p>
                <p className="text-xs text-slate-500">
                  Đã thu {formatVND(d.paidAmount)} / {formatVND(d.totalAmount)}
                  {d.dueDate && ` • Hạn ${formatDate(d.dueDate)}`}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
