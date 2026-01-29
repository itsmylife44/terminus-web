'use client';

import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { logout } from '@/lib/store/authSlice';
import { ConnectionStatus } from '@/components/terminal/ConnectionStatus';
import { UpdateNotification } from './UpdateNotification';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const username = useAppSelector((state) => state.auth.username);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-background-elevated/80 backdrop-blur-xl border-b border-white/6">
      {/* Left: Hamburger (mobile) */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-1 text-foreground-muted hover:text-foreground transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            <span className="sr-only">Open menu</span>
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Right: Status + User + Logout */}
      <div className="flex items-center gap-4">
        <UpdateNotification />
        <ConnectionStatus />
        {username && (
          <span className="text-sm text-foreground-muted hidden sm:inline-block">{username}</span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground hover:bg-white/5 rounded-md border border-white/0 hover:border-white/10 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
