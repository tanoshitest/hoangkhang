'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, CreditCard,
  BarChart3, Settings, LogOut, Menu, X, Bell, ClipboardList, AlertTriangle,
  UserCheck, Wallet, Kanban, School, UserCog, ClipboardCheck, TrendingUp, LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };
type NavGroup = { title?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    items: [{ href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard }],
  },
  {
    title: 'Tuyển sinh',
    items: [
      { href: '/leads', label: 'Khách hàng tiềm năng', icon: Users },
      { href: '/leads/kanban', label: 'Phễu bán hàng', icon: Kanban },
      { href: '/enrollments', label: 'Ghi danh', icon: ClipboardList },
    ],
  },
  {
    title: 'Quản lý người dùng',
    items: [
      { href: '/students', label: 'Quản lý học viên', icon: GraduationCap },
      { href: '/teachers', label: 'Quản lý giáo viên', icon: UserCheck },
      { href: '/staff', label: 'Quản lý nhân viên', icon: UserCog, adminOnly: true },
    ],
  },
  {
    title: 'Đào tạo',
    items: [
      { href: '/courses', label: 'Quản lý khóa học', icon: BookOpen },
      { href: '/classes', label: 'Quản lý lớp học', icon: School },
      { href: '/sessions', label: 'Quản lý lịch dạy', icon: Calendar },
      { href: '/reports/attendance', label: 'Báo cáo chuyên cần', icon: ClipboardCheck },
      { href: '/reports/training-results', label: 'Báo cáo kết quả đào tạo', icon: TrendingUp },
      { href: '/warnings', label: 'Cảnh báo học viên', icon: AlertTriangle },
    ],
  },
  {
    title: 'Tài chính',
    items: [
      { href: '/finance', label: 'Tài chính', icon: CreditCard },
      { href: '/payroll', label: 'Bảng lương', icon: Wallet },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/reports', label: 'Báo cáo', icon: BarChart3 },
      { href: '/notifications', label: 'Thông báo', icon: Bell },
      { href: '/settings', label: 'Cấu hình', icon: Settings, adminOnly: true },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên', manager: 'Quản lý', sales: 'Tư vấn',
  academic: 'Đào tạo', teacher: 'Giáo viên', accountant: 'Kế toán',
};

const BARE_PATHS = ['/login', '/'];
const DESKTOP_MQ = '(min-width: 1024px)';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isBare = BARE_PATHS.includes(pathname);

  useEffect(() => {
    if (isBare) {
      setChecked(true);
      return;
    }
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
    setChecked(true);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setUnreadCount(d.unreadCount || 0))
      .catch(() => {});
  }, [router, isBare]);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => {
      setDesktop(mq.matches);
      if (mq.matches) setOpen(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (isBare) return <>{children}</>;

  if (!checked || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user.roles?.includes('admin');
  const groups = NAV
    .map(g => ({ ...g, items: g.items.filter(i => !i.adminOnly || isAdmin) }))
    .filter(g => g.items.length > 0);

  const navHrefs = groups.flatMap(g => g.items.map(i => i.href));
  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (!pathname.startsWith(`${href}/`)) return false;
    return !navHrefs.some(
      other => other !== href && other.startsWith(`${href}/`) &&
        (pathname === other || pathname.startsWith(`${other}/`)),
    );
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'z-40 flex h-dvh w-56 shrink-0 flex-col border-r border-slate-200 bg-white print:hidden',
          desktop
            ? 'relative'
            : cn('fixed inset-y-0 left-0 transition-transform', open ? 'translate-x-0' : '-translate-x-full'),
        )}
      >
        {/* Logo */}
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-200 px-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white">
            <GraduationCap className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-bold tracking-tight text-slate-900">CRM Hoàng Khang</span>
          {!desktop && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto rounded-md p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Đóng menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-1.5">
          {groups.map(group => (
            <div key={group.title ?? group.items[0]?.href}>
              {group.title && (
                <p className="px-2 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.title}
                </p>
              )}
              <ul>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium leading-none transition-colors',
                          active
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        )}
                      >
                        <Icon className={cn('h-3.5 w-3.5', active && 'text-brand-600')} />
                        {item.label}
                        {item.href === '/notifications' && unreadCount > 0 && (
                          <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-slate-200 p-1.5">
          <div className="flex items-center gap-1.5 rounded-md px-1 py-1">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium leading-tight text-slate-900">{user.name}</p>
              <p className="truncate text-[10px] leading-tight text-slate-500">
                {user.roles.map(r => ROLE_LABELS[r] || r).join(', ')}
              </p>
            </div>
            <Link
              href="/notifications"
              className="relative rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
              title="Thông báo"
            >
              <Bell className="h-3.5 w-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
              title="Đăng xuất"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay khi mở sidebar mobile */}
      {!desktop && open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Nội dung */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!desktop && (
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 print:hidden">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-slate-900">CRM Hoàng Khang</span>
            <Link href="/notifications" className="relative ml-auto rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </header>
        )}

        <main
          id="app-scroll"
          className="relative flex min-h-0 flex-1 flex-col overflow-y-auto p-4 lg:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex flex-wrap items-start justify-between gap-3', className)}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
