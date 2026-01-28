'use client';

import type { FormEvent } from 'react';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/store/hooks';
import { login, setAuthError } from '@/lib/store/authSlice';
import { openCodeClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const username = usernameRef.current?.value || '';
    const password = passwordRef.current?.value || '';

    if (!password) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'opencode_auth',
          JSON.stringify({
            username,
            password,
          })
        );
      }

      const isHealthy = await openCodeClient.health();

      if (isHealthy) {
        dispatch(login({ username, password }));
        router.push('/');
      } else {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('opencode_auth');
        }
        setError('Invalid credentials');
        dispatch(setAuthError('Invalid credentials'));
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('opencode_auth');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Login</h1>
          <p className="text-muted-foreground">Enter your credentials to access Terminus</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium leading-6 mb-1">
                Username
              </label>
              <Input
                ref={usernameRef}
                id="username"
                name="username"
                type="text"
                required
                defaultValue="admin"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium leading-6 mb-1">
                Password
              </label>
              <Input
                ref={passwordRef}
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
