'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface DashboardStats {
  newLeads: number;
  followUpLeads: number;
  overdueLeads: number;
  activeStudents: number;
  waitingStudents: number;
  reservedStudents: number;
  droppedStudents: number;
  completedStudents: number;
  recruitingClasses: number;
  studyingClasses: number;
  totalReceivables: number;
  paidAmount: number;
  debtAmount: number;
  overdueDebt: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    newLeads: 0,
    followUpLeads: 0,
    overdueLeads: 0,
    activeStudents: 0,
    waitingStudents: 0,
    reservedStudents: 0,
    droppedStudents: 0,
    completedStudents: 0,
    recruitingClasses: 0,
    studyingClasses: 0,
    totalReceivables: 0,
    paidAmount: 0,
    debtAmount: 0,
    overdueDebt: 0,
  });

  const statCards = [
    {
      title: 'Lead mới',
      value: stats.newLeads,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: 'Học viên đang học',
      value: stats.activeStudents,
      icon: GraduationCap,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      title: 'Lớp đang học',
      value: stats.studyingClasses,
      icon: BookOpen,
      color: 'bg-purple-500',
      change: '+3',
    },
    {
      title: 'Phải thu',
      value: `${(stats.totalReceivables / 1000000).toFixed(1)}M`,
      icon: CreditCard,
      color: 'bg-yellow-500',
      change: '+15%',
    },
  ];

  const alertCards = [
    {
      title: 'Lead quá hạn',
      value: stats.overdueLeads,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      title: 'Công nợ quá hạn',
      value: stats.overdueDebt,
      icon: CreditCard,
      color: 'bg-red-500',
    },
    {
      title: 'Chờ xếp lớp',
      value: stats.waitingStudents,
      icon: Calendar,
      color: 'bg-orange-500',
    },
    {
      title: 'Bảo lưu',
      value: stats.reservedStudents,
      icon: CheckCircle,
      color: 'bg-blue-500',
    },
  ];

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Stats Cards */}
        <div className="mt-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <div key={card.title} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <card.icon className={`h-6 w-6 text-white ${card.color} p-1 rounded`} />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {card.title}
                        </dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {card.value}
                          </div>
                          <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                            <TrendingUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                            <span className="sr-only">Increased by</span>
                            {card.change}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Cards */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Cảnh báo</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {alertCards.map((card) => (
              <div key={card.title} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <card.icon className={`h-6 w-6 text-white ${card.color} p-1 rounded`} />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {card.title}
                        </dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {card.value}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Thao tác nhanh</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              <li>
                <a href="/leads/new" className="block hover:bg-gray-50 px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-blue-600">
                      + Tạo Lead mới
                    </div>
                    <div className="text-sm text-gray-500">
                      Thêm khách hàng tiềm năng
                    </div>
                  </div>
                </a>
              </li>
              <li>
                <a href="/students/new" className="block hover:bg-gray-50 px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-blue-600">
                      + Thêm Học viên
                    </div>
                    <div className="text-sm text-gray-500">
                      Tạo hồ sơ học viên mới
                    </div>
                  </div>
                </a>
              </li>
              <li>
                <a href="/classes/new" className="block hover:bg-gray-50 px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-blue-600">
                      + Tạo Lớp học
                    </div>
                    <div className="text-sm text-gray-500">
                      Mở lớp học mới
                    </div>
                  </div>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
