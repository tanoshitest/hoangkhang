'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, GraduationCap, BookOpen, Calendar, CreditCard,
  AlertTriangle, CheckCircle, Clock, Wallet,
} from 'lucide-react';
import { formatVND } from '../finance/page';

interface DashboardData {
  leads: { new: number; followUpDue: number; followUpOverdue: number };
  students: {
    studying: number; waitingClass: number; reserved: number;
    dropped: number; completed: number; transferred: number;
  };
  classes: {
    recruiting: number; studying: number; capacity: number;
    enrolled: number; fillRate: number;
  };
  warnings: { open: number };
  finance: {
    totalReceivable: number; totalCollected: number;
    totalRemaining: number; overdueCount: number; overdueAmount: number;
  };
  teachers: { taughtSessions: number };
  today: { sessions: number };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64">Đang tải...</div>;
  if (!data) return <div className="text-center py-12 text-slate-500">Không tải được dữ liệu</div>;

  const statCards = [
    { title: 'KH tiềm năng mới', value: data.leads.new, icon: Users, color: 'bg-brand-500', href: '/leads' },
    { title: 'Học viên đang học', value: data.students.studying, icon: GraduationCap, color: 'bg-green-500', href: '/students' },
    { title: 'Lớp đang học', value: data.classes.studying, icon: BookOpen, color: 'bg-purple-500', href: '/classes' },
    { title: 'Buổi học hôm nay', value: data.today.sessions, icon: Calendar, color: 'bg-indigo-500', href: '/sessions' },
  ];

  const alertCards = [
    { title: 'Chăm sóc quá hạn', value: data.leads.followUpOverdue, icon: AlertTriangle, color: 'bg-red-500', href: '/leads' },
    { title: 'Công nợ quá hạn', value: data.finance.overdueCount, sub: formatVND(data.finance.overdueAmount), icon: CreditCard, color: 'bg-red-500', href: '/finance/debt' },
    { title: 'Chờ xếp lớp', value: data.students.waitingClass, icon: Clock, color: 'bg-orange-500', href: '/students' },
    { title: 'Cảnh báo học tập', value: data.warnings.open, icon: AlertTriangle, color: 'bg-yellow-500', href: '/warnings' },
  ];

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        {/* Main stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Link key={card.title} href={card.href} className="bg-white overflow-hidden border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <card.icon className={`h-6 w-6 text-white ${card.color} p-1 rounded`} />
                  <div className="ml-5">
                    <p className="text-sm font-medium text-slate-500 truncate">{card.title}</p>
                    <p className="text-xl font-bold tracking-tight text-slate-900">{card.value}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Alerts */}
        <h2 className="mt-8 text-base font-semibold text-slate-900 mb-4">Cần chú ý</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {alertCards.map((card) => (
            <Link key={card.title} href={card.href} className="bg-white overflow-hidden border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <card.icon className={`h-6 w-6 text-white ${card.color} p-1 rounded`} />
                  <div className="ml-5">
                    <p className="text-sm font-medium text-slate-500 truncate">{card.title}</p>
                    <p className="text-xl font-bold tracking-tight text-slate-900">{card.value}</p>
                    {card.sub && <p className="text-xs text-red-600">{card.sub}</p>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Finance + Students breakdown */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
              <Wallet className="h-5 w-5 mr-2 text-brand-500" /> Tài chính
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-slate-500">Tổng phải thu</dt>
                <dd className="text-lg font-semibold text-slate-900">{formatVND(data.finance.totalReceivable)}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Đã thu</dt>
                <dd className="text-lg font-semibold text-green-600">{formatVND(data.finance.totalCollected)}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Còn nợ</dt>
                <dd className="text-lg font-semibold text-yellow-600">{formatVND(data.finance.totalRemaining)}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Lấp đầy lớp</dt>
                <dd className="text-lg font-semibold text-slate-900">
                  {data.classes.fillRate}% <span className="text-xs font-normal text-slate-500">({data.classes.enrolled}/{data.classes.capacity})</span>
                </dd>
              </div>
            </dl>
            <Link href="/finance" className="mt-4 inline-block text-sm text-brand-600 hover:underline">Xem chi tiết →</Link>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-green-500" /> Học viên
            </h3>
            <dl className="grid grid-cols-3 gap-4">
              <div><dt className="text-sm text-slate-500">Đang học</dt><dd className="text-lg font-semibold text-green-600">{data.students.studying}</dd></div>
              <div><dt className="text-sm text-slate-500">Chờ lớp</dt><dd className="text-lg font-semibold text-orange-600">{data.students.waitingClass}</dd></div>
              <div><dt className="text-sm text-slate-500">Bảo lưu</dt><dd className="text-lg font-semibold text-brand-600">{data.students.reserved}</dd></div>
              <div><dt className="text-sm text-slate-500">Nghỉ</dt><dd className="text-lg font-semibold text-red-600">{data.students.dropped}</dd></div>
              <div><dt className="text-sm text-slate-500">Hoàn thành</dt><dd className="text-lg font-semibold text-slate-900">{data.students.completed}</dd></div>
              <div><dt className="text-sm text-slate-500">Chuyển</dt><dd className="text-lg font-semibold text-slate-900">{data.students.transferred}</dd></div>
            </dl>
            <Link href="/students" className="mt-4 inline-block text-sm text-brand-600 hover:underline">Xem chi tiết →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
