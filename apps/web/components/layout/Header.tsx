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
    <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
      {/* Left: Hamburger (mobile) + Branding */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-1 text-gray-400 hover:text-white transition-colors"
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
        <h1 className="text-xl font-bold text-white tracking-tight">Terminus</h1>
      </div>

      {/* Right: Status + User + Logout */}
      <div className="flex items-center gap-4">
        <UpdateNotification />
        <ConnectionStatus />
        {username && (
          <span className="text-sm text-gray-400 hidden sm:inline-block">{username}</span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
