'use client';

import { useState, useEffect } from 'react';
import UsersPanel from '@/components/admin/UsersPanel';

export default function StaffPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const roles = userData ? JSON.parse(userData).roles || [] : [];
    setIsAdmin(roles.includes('admin'));
  }, []);

  if (isAdmin === null) {
    return <p className="text-center py-8 text-sm text-slate-500">Đang tải...</p>;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">Bạn không có quyền truy cập trang này</p>
          <p className="text-sm text-yellow-600 mt-1">Chỉ tài khoản Quản trị viên mới quản lý được nhân viên.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <UsersPanel />
      </div>
    </div>
  );
}
