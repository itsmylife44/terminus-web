'use client';

import type { ReactNode } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { login } from '@/lib/store/authSlice';

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        <p className="text-sm text-gray-400">Verifying session...</p>
      </div>
    </div>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [isReady, setIsReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const hasRestoredSession = useRef(false);

  useEffect(() => {
    if (hasRestoredSession.current) {
      return;
    }
    hasRestoredSession.current = true;

    if (typeof window !== 'undefined') {
      const storedAuth = sessionStorage.getItem('opencode_auth');
      if (storedAuth) {
        try {
          const { username, password } = JSON.parse(storedAuth);
          if (username && password) {
            dispatch(login({ username, password }));
            return;
          }
        } catch {
          sessionStorage.removeItem('opencode_auth');
        }
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (!hasRestoredSession.current) {
      return;
    }

    const isLoginPage = pathname === '/login';

    if (isLoginPage) {
      if (isAuthenticated) {
        setIsNavigating(true);
        router.replace('/');
      } else {
        setIsReady(true);
        setIsNavigating(false);
      }
      return;
    }

    if (isAuthenticated) {
      setIsReady(true);
      setIsNavigating(false);
    } else {
      setIsNavigating(true);
      router.replace('/login');
    }
  }, [isAuthenticated, pathname, router]);

  if (!isReady || isNavigating) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
