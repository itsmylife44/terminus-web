'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { login } from '@/lib/store/authSlice';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [isChecking, setIsChecking] = useState(true);
  const hasRestoredSession = useRef(false);

  useEffect(() => {
    // Only restore session once on mount
    if (!hasRestoredSession.current && !isAuthenticated) {
      if (typeof window !== 'undefined') {
        const storedAuth = sessionStorage.getItem('opencode_auth');
        if (storedAuth) {
          try {
            const { username, password } = JSON.parse(storedAuth);
            if (username && password) {
              dispatch(login({ username, password }));
              hasRestoredSession.current = true;
            }
          } catch (e) {
            sessionStorage.removeItem('opencode_auth');
          }
        }
      }
    }
    hasRestoredSession.current = true;
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    // Handle routing based on auth state
    if (pathname === '/login') {
      setIsChecking(false);
      if (isAuthenticated) {
        router.replace('/');
      }
      return;
    }

    if (isAuthenticated) {
      setIsChecking(false);
      return;
    }

    // Not authenticated, not on login page -> redirect
    router.replace('/login');
  }, [isAuthenticated, pathname, router]);

  if (isChecking && pathname !== '/login') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          <p className="text-sm text-gray-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
