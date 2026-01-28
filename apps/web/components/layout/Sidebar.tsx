'use client';

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchPtySessions, deletePtySession, PtySession } from '@/lib/store/ptySessionsSlice';
import { addTab, setActiveTab } from '@/lib/store/tabsSlice';

// Icons
const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <title>Home</title>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const TerminalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <title>Terminal</title>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" x2="20" y1="19" y2="19" />
  </svg>
);

const ListIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <title>Sessions</title>
    <line x1="8" x2="21" y1="6" y2="6" />
    <line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" />
    <line x1="3" x2="3.01" y1="6" y2="6" />
    <line x1="3" x2="3.01" y1="12" y2="12" />
    <line x1="3" x2="3.01" y1="18" y2="18" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <title>Settings</title>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const navItems = [
  { path: '/', label: 'Dashboard', icon: HomeIcon },
  { path: '/terminal', label: 'Terminal', icon: TerminalIcon },
  { path: '/sessions', label: 'AI Sessions', icon: ListIcon },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Status indicator component for PTY sessions
 */
function StatusDot({ status }: { status: string }) {
  const colors = {
    active: 'bg-emerald-500',
    disconnected: 'bg-amber-500',
    closed: 'bg-gray-500',
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status as keyof typeof colors] || colors.closed}`}
    />
  );
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { sessions, isLoading } = useAppSelector((state) => state.ptySessions);
  const { tabs } = useAppSelector((state) => state.tabs);

  // Fetch PTY sessions on mount
  useEffect(() => {
    dispatch(fetchPtySessions());
  }, [dispatch]);

  // Handle clicking on a PTY session
  const handleSessionClick = (session: PtySession) => {
    // Check if this session is already open in a tab
    const existingTab = tabs.find((t) => t.id === session.id || t.ptyId === session.pty_id);

    if (existingTab) {
      // Session already open, just switch to it
      dispatch(setActiveTab(existingTab.id));
    } else {
      // Open new tab for this session
      dispatch(
        addTab({
          id: session.id,
          ptyId: session.pty_id,
          title: session.title,
        })
      );
    }

    // Navigate to terminal if not already there
    if (!pathname.startsWith('/terminal')) {
      router.push('/terminal');
    }

    onClose?.();
  };

  // Handle deleting a PTY session
  const handleDeleteSession = (e: MouseEvent, sessionId: string) => {
    e.stopPropagation();
    dispatch(deletePtySession(sessionId));
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-gray-950 border-r border-gray-800">
      {/* Header */}
      <div className="flex h-14 items-center px-6 border-b border-gray-800">
        <span className="text-lg font-bold text-white tracking-wider">TERMINUS</span>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-900 hover:text-white'
              }`}
            >
              <span
                className={`mr-3 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}
              >
                <item.icon />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* PTY Sessions Section */}
      <div className="flex-1 overflow-hidden flex flex-col border-t border-gray-800">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Terminal Sessions
          </span>
          {isLoading && <span className="text-xs text-gray-600">Loading...</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {sessions.length === 0 && !isLoading ? (
            <div className="px-3 py-4 text-center text-gray-600 text-xs">No saved sessions</div>
          ) : (
            sessions.map((session) => {
              const isOpenInTab = tabs.some(
                (t) => t.id === session.id || t.ptyId === session.pty_id
              );

              return (
                <button
                  type="button"
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  className={`group w-full flex items-center gap-2 rounded-md px-3 py-2 text-left transition-colors ${
                    isOpenInTab
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <StatusDot status={session.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{session.title}</div>
                    <div className="text-xs text-gray-600 truncate">
                      {formatRelativeTime(session.last_connected_at)}
                    </div>
                  </div>
                  {session.status === 'closed' && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-all"
                      title="Delete session"
                    >
                      <XIcon />
                    </button>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-medium text-white">
            U
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">User</span>
            <span className="text-xs text-gray-500">user@example.com</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-64 transform transition-transform">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
