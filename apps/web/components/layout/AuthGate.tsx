'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { login } from '@/lib/store/authSlice';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      // If already authenticated in Redux, we're good
      if (isAuthenticated) {
        setIsChecking(false);
        // If we're on login page and authenticated, redirect to home
        if (pathname === '/login') {
          router.replace('/');
        }
        return;
      }

      // Check if we have credentials in sessionStorage (persistence)
      // This handles page reloads where Redux state is reset but session remains
      if (typeof window !== 'undefined') {
        const storedAuth = sessionStorage.getItem('opencode_auth');
        if (storedAuth) {
          try {
            const { username, password } = JSON.parse(storedAuth);
            if (username && password) {
              // Restore session
              dispatch(login({ username, password }));
              setIsChecking(false);
              return;
            }
          } catch (e) {
            // Invalid JSON, ignore
            sessionStorage.removeItem('opencode_auth');
          }
        }
      }

      // Allow access to login page without auth
      if (pathname === '/login') {
        setIsChecking(false);
        return;
      }

      // Not authenticated and not on login page -> redirect
      router.replace('/login');
      // Keep isChecking true until redirect happens to prevent content flash
    };

    checkAuth();
  }, [isAuthenticated, pathname, router, dispatch]);

  // Show loading spinner while checking auth to prevent content flash
  if (isChecking) {
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
