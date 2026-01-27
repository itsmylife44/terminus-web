'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/store/hooks';
import { login, setAuthError } from '@/lib/store/authSlice';
import { openCodeClient } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState('opencode');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);

    try {
      // Temporarily store credentials in session storage for the client to use them
      // This is a bit of a hack since client.ts reads from sessionStorage directly
      // In a real app we might pass credentials directly to health() or configure the client
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('opencode_auth', JSON.stringify({
          username,
          password
        }));
      }

      // Validate credentials by calling health check
      const isHealthy = await openCodeClient.health();

      if (isHealthy) {
        dispatch(login({ username, password }));
        router.push('/');
      } else {
        // If health check failed, clear the temp credentials
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
          <p className="text-muted-foreground">
            Enter your credentials to access Terminus
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="username" 
                className="block text-sm font-medium leading-6 mb-1"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              />
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium leading-6 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
