'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { formatDate } from '../finance/page';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  lead_reminder: { label: 'KH tiềm năng', color: 'bg-brand-100 text-brand-800' },
  followup_due: { label: 'Chăm sóc', color: 'bg-yellow-100 text-yellow-800' },
  class_starting: { label: 'Lớp học', color: 'bg-purple-100 text-purple-800' },
  class_ending: { label: 'Lớp học', color: 'bg-indigo-100 text-indigo-800' },
  debt_due: { label: 'Công nợ', color: 'bg-red-100 text-red-800' },
  warning_stale: { label: 'Cảnh báo', color: 'bg-orange-100 text-orange-800' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const scan = async () => {
    setScanning(true);
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/scan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchNotifications();
    setScanning(false);
  };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center">
            Thông báo {unread > 0 && <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">{unread} chưa đọc</span>}
          </h1>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button onClick={scan} disabled={scanning}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 mr-1 ${scanning ? 'animate-spin' : ''}`} /> Quét thông báo
            </button>
            {unread > 0 && (
              <button onClick={markAllRead}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100">
                <CheckCheck className="h-4 w-4 mr-1" /> Đọc tất cả
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
          {loading ? (
            <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-2 text-sm text-slate-500">Chưa có thông báo nào</p>
              <p className="text-xs text-slate-400 mt-1">Nhấn "Quét thông báo" để kiểm tra các quy tắc cảnh báo</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {notifications.map((n) => (
                <li key={n.id}
                  className={`px-4 py-4 sm:px-6 ${!n.isRead ? 'bg-brand-50' : ''} ${!n.isRead ? 'cursor-pointer' : ''}`}
                  onClick={() => !n.isRead && markRead(n.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_LABELS[n.type]?.color || 'bg-slate-100'}`}>
                          {TYPE_LABELS[n.type]?.label || n.type}
                        </span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-500" />}
                      </div>
                      <p className={`text-sm mt-1 ${!n.isRead ? 'font-medium text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{n.content}</p>
                    </div>
                    <span className="text-xs text-slate-400 ml-4 whitespace-nowrap">{formatDate(n.createdAt)}</span>
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
