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
  if (!data) return <div className="text-center py-12 text-gray-500">Không tải được dữ liệu</div>;

  const statCards = [
    { title: 'Lead mới', value: data.leads.new, icon: Users, color: 'bg-blue-500', href: '/leads' },
    { title: 'Học viên đang học', value: data.students.studying, icon: GraduationCap, color: 'bg-green-500', href: '/students' },
    { title: 'Lớp đang học', value: data.classes.studying, icon: BookOpen, color: 'bg-purple-500', href: '/classes' },
    { title: 'Buổi học hôm nay', value: data.today.sessions, icon: Calendar, color: 'bg-indigo-500', href: '/sessions' },
  ];

  const alertCards = [
    { title: 'Follow-up quá hạn', value: data.leads.followUpOverdue, icon: AlertTriangle, color: 'bg-red-500', href: '/leads' },
    { title: 'Công nợ quá hạn', value: data.finance.overdueCount, sub: formatVND(data.finance.overdueAmount), icon: CreditCard, color: 'bg-red-500', href: '/finance/debt' },
    { title: 'Chờ xếp lớp', value: data.students.waitingClass, icon: Clock, color: 'bg-orange-500', href: '/students' },
    { title: 'Cảnh báo học tập', value: data.warnings.open, icon: AlertTriangle, color: 'bg-yellow-500', href: '/warnings' },
  ];

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

        {/* Main stats */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Link key={card.title} href={card.href} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <card.icon className={`h-6 w-6 text-white ${card.color} p-1 rounded`} />
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 truncate">{card.title}</p>
                    <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Alerts */}
        <h2 className="mt-8 text-lg font-medium text-gray-900 mb-4">Cần chú ý</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {alertCards.map((card) => (
            <Link key={card.title} href={card.href} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <card.icon className={`h-6 w-6 text-white ${card.color} p-1 rounded`} />
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 truncate">{card.title}</p>
                    <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                    {card.sub && <p className="text-xs text-red-600">{card.sub}</p>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Finance + Students breakdown */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Wallet className="h-5 w-5 mr-2 text-blue-500" /> Tài chính
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Tổng phải thu</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatVND(data.finance.totalReceivable)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Đã thu</dt>
                <dd className="text-lg font-semibold text-green-600">{formatVND(data.finance.totalCollected)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Còn nợ</dt>
                <dd className="text-lg font-semibold text-yellow-600">{formatVND(data.finance.totalRemaining)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Lấp đầy lớp</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {data.classes.fillRate}% <span className="text-xs font-normal text-gray-500">({data.classes.enrolled}/{data.classes.capacity})</span>
                </dd>
              </div>
            </dl>
            <Link href="/finance" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Xem chi tiết →</Link>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-green-500" /> Học viên
            </h3>
            <dl className="grid grid-cols-3 gap-4">
              <div><dt className="text-sm text-gray-500">Đang học</dt><dd className="text-lg font-semibold text-green-600">{data.students.studying}</dd></div>
              <div><dt className="text-sm text-gray-500">Chờ lớp</dt><dd className="text-lg font-semibold text-orange-600">{data.students.waitingClass}</dd></div>
              <div><dt className="text-sm text-gray-500">Bảo lưu</dt><dd className="text-lg font-semibold text-blue-600">{data.students.reserved}</dd></div>
              <div><dt className="text-sm text-gray-500">Nghỉ</dt><dd className="text-lg font-semibold text-red-600">{data.students.dropped}</dd></div>
              <div><dt className="text-sm text-gray-500">Hoàn thành</dt><dd className="text-lg font-semibold text-gray-900">{data.students.completed}</dd></div>
              <div><dt className="text-sm text-gray-500">Chuyển</dt><dd className="text-lg font-semibold text-gray-900">{data.students.transferred}</dd></div>
            </dl>
            <Link href="/students" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Xem chi tiết →</Link>
          </div>
        </div>

        {/* Quick actions */}
        <h2 className="mt-8 text-lg font-medium text-gray-900 mb-4">Thao tác nhanh</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {[
              { href: '/leads/new', label: '+ Tạo Lead mới', desc: 'Thêm khách hàng tiềm năng' },
              { href: '/students/new', label: '+ Thêm Học viên', desc: 'Tạo hồ sơ học viên mới' },
              { href: '/finance/receivables/new', label: '+ Tạo khoản phải thu', desc: 'Ghi nhận học phí cần thu' },
              { href: '/payroll', label: '+ Tạo bảng lương', desc: 'Đối soát giờ dạy giáo viên' },
            ].map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="block hover:bg-gray-50 px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600">{a.label}</span>
                    <span className="text-sm text-gray-500">{a.desc}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
