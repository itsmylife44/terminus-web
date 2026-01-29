'use client';

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

  const handleSubmit = async (e: React.FormEvent) => {
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
    <main className="relative flex min-h-screen flex-col items-center justify-center p-6 overflow-hidden bg-background-deep">
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/20 blur-[120px] animate-[blob-float_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-accent-bright/15 blur-[100px] animate-[blob-float_25s_ease-in-out_infinite_reverse]" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Glass card */}
        <div className="bg-background-elevated/80 backdrop-blur-xl border border-white/6 rounded-lg p-8 shadow-card">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 gradient-text-primary">Login</h1>
            <p className="text-foreground-muted">Enter your credentials to access Terminus</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-foreground leading-6 mb-2"
                >
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
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground leading-6 mb-2"
                >
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

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 text-center">
                {error}
              </div>
            )}

            <div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
