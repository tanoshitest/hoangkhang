'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/leads', label: 'Dạng bảng' },
  { href: '/leads/kanban', label: 'Kanban' },
  { href: '/enrollments', label: 'Ghi danh' },
];

export function SalesTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200">
      <div className="flex min-w-0 flex-wrap gap-0.5">
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/leads'
              ? pathname === '/leads' ||
                (pathname.startsWith('/leads/') && !pathname.startsWith('/leads/kanban'))
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
