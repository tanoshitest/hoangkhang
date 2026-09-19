'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

function destFor(user: { roles?: string[]; studentId?: string | null; teacherId?: string | null }) {
  const roles = user.roles || [];
  const staff = roles.some(r => ['admin', 'manager', 'sales', 'sales_leader', 'academic', 'accountant'].includes(r));
  if (staff) return '/dashboard';
  if (roles.includes('student')) return '/portal/student';
  if (roles.includes('teacher')) return '/portal/teacher';
  return '/dashboard';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const googleBtn = useRef<HTMLDivElement>(null);

  const saveSession = (data: any) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    router.push(destFor(data.user));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        saveSession(data);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Nút đăng nhập Google (GIS) — chỉ render khi đã cấu hình Client ID
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtn.current) return;
    const handleCredential = async (resp: { credential: string }) => {
      setError('');
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: resp.credential }),
        });
        const data = await r.json();
        if (r.ok) saveSession(data);
        else setError(data.error || 'Đăng nhập Google thất bại');
      } catch {
        setError('Network error');
      }
    };
    const init = () => {
      const g = (window as any).google;
      if (!g?.accounts?.id || !googleBtn.current) return;
      g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential });
      g.accounts.id.renderButton(googleBtn.current, { theme: 'outline', size: 'large', width: 320, text: 'signin_with', locale: 'vi' });
    };
    if ((window as any).google?.accounts?.id) init();
    else {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = init;
      document.head.appendChild(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#f6f8fb] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            CRM Hoàng Khang
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Đăng nhập vào hệ thống
          </p>
        </div>
        <form className="space-y-5" onSubmit={handleLogin}>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm -space-y-px overflow-hidden">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-t-md focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-b-md focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:z-10 sm:text-sm"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-200 disabled:opacity-50"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </div>
        </form>

        {GOOGLE_CLIENT_ID && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">hoặc</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div ref={googleBtn} className="flex justify-center" />
            <p className="text-center text-xs text-slate-400">
              Học viên đăng nhập bằng tài khoản Google đã đăng ký với trung tâm
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
