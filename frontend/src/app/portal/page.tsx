'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalIndex() {
  const router = useRouter();
  useEffect(() => {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    const roles: string[] = user?.roles || [];
    if (roles.includes('student')) router.replace('/portal/student');
    else if (roles.includes('teacher')) router.replace('/portal/teacher');
    else router.replace('/dashboard');
  }, [router]);
  return null;
}
