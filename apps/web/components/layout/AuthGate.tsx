'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { login } from '@/lib/store/authSlice';

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    </div>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (authChecked) return;

    const storedAuth = sessionStorage.getItem('opencode_auth');
    if (storedAuth) {
      try {
        const { username, password } = JSON.parse(storedAuth);
        if (username && password) {
          dispatch(login({ username, password }));
        }
      } catch {
        sessionStorage.removeItem('opencode_auth');
      }
    }
    setAuthChecked(true);
  }, [authChecked, dispatch]);

  useEffect(() => {
    if (!authChecked) return;

    const isLoginPage = pathname === '/login';

    if (isLoginPage && isAuthenticated) {
      router.replace('/');
    } else if (!isLoginPage && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authChecked, isAuthenticated, pathname, router]);

  if (!authChecked) {
    return <LoadingScreen />;
  }

  const isLoginPage = pathname === '/login';
  const shouldShowContent = isLoginPage ? !isAuthenticated : isAuthenticated;

  if (!shouldShowContent) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
