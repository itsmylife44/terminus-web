'use client';

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
  fetchPtySessions,
  deletePtySession,
  renamePtySession,
  PtySession,
} from '@/lib/store/ptySessionsSlice';
import { addTab, setActiveTab, updateTabTitle } from '@/lib/store/tabsSlice';
import { ContextMenu, ContextMenuItem } from '@/components/ui/context-menu';
import { SessionManager } from '@/components/terminal/SessionManager';

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

const navItems = [
  { path: '/', label: 'Dashboard', icon: HomeIcon },
  { path: '/terminal', label: 'Terminal', icon: TerminalIcon },
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
    active: 'bg-accent',
    disconnected: 'bg-amber-500',
    closed: 'bg-foreground-subtle',
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

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    sessionId: string | null;
  }>({ visible: false, x: 0, y: 0, sessionId: null });

  // Fetch PTY sessions on mount
  useEffect(() => {
    dispatch(fetchPtySessions());
  }, [dispatch]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible]);

  const handleSessionClick = (session: PtySession) => {
    if (session.status === 'closed') {
      return;
    }

    const existingTab = tabs.find((t) => t.id === session.id || t.ptyId === session.pty_id);

    if (existingTab) {
      dispatch(setActiveTab(existingTab.id));
    } else {
      dispatch(
        addTab({
          id: session.id,
          ptyId: session.pty_id,
          title: session.title,
        })
      );
    }

    if (!pathname.startsWith('/terminal')) {
      router.push('/terminal');
    }

    onClose?.();
  };

  // Handle right-click context menu
  const handleContextMenu = (e: MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      sessionId,
    });
  };

  const handleRename = async () => {
    const session = sessions.find((s) => s.id === contextMenu.sessionId);
    if (!session || !contextMenu.sessionId) return;

    const newTitle = window.prompt('Rename session:', session.title);

    if (newTitle && newTitle.trim() !== '' && newTitle !== session.title) {
      try {
        await dispatch(
          renamePtySession({ id: contextMenu.sessionId, title: newTitle.trim() })
        ).unwrap();

        const openTab = tabs.find((t) => t.id === session.id || t.ptyId === session.pty_id);
        if (openTab) {
          dispatch(updateTabTitle({ id: openTab.id, title: newTitle.trim() }));
        }
      } catch (error) {
        console.error('Failed to rename session:', error);
      }
    }

    setContextMenu({ visible: false, x: 0, y: 0, sessionId: null });
  };

  const handleDelete = () => {
    if (contextMenu.sessionId) {
      dispatch(deletePtySession(contextMenu.sessionId));
    }
    setContextMenu({ visible: false, x: 0, y: 0, sessionId: null });
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-background-elevated/80 backdrop-blur-xl border-r border-white/6">
      {/* Header */}
      <div className="flex h-14 items-center px-6 border-b border-white/6">
        <span className="text-lg font-bold text-foreground tracking-wider">TERMINUS</span>
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
              className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                isActive
                  ? 'bg-white/10 text-foreground'
                  : 'text-foreground-muted hover:bg-white/5 hover:text-foreground'
              }`}
            >
              <span
                className={`mr-3 flex-shrink-0 ${isActive ? 'text-foreground' : 'text-foreground-muted group-hover:text-foreground'}`}
              >
                <item.icon />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Session Manager */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <SessionManager onClose={onClose} />
      </div>

      {/* PTY Sessions Section (Legacy - keeping for context menu) */}
      <div className="flex-1 overflow-hidden flex-col border-t border-white/6 hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">
            Terminal Sessions
          </span>
          {isLoading && <span className="text-xs text-foreground-subtle">Loading...</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {sessions.length === 0 && !isLoading ? (
            <div className="px-3 py-4 text-center text-foreground-subtle text-xs">
              No saved sessions
            </div>
          ) : (
            sessions.map((session) => {
              const isOpenInTab = tabs.some(
                (t) => t.id === session.id || t.ptyId === session.pty_id
              );
              const isClosed = session.status === 'closed';

              return (
                <button
                  type="button"
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  onContextMenu={(e) => handleContextMenu(e, session.id)}
                  disabled={isClosed}
                  className={`group w-full flex items-center gap-2 rounded-md px-3 py-2 text-left transition-all duration-200 ${
                    isClosed
                      ? 'text-foreground-subtle cursor-not-allowed opacity-60'
                      : isOpenInTab
                        ? 'bg-white/10 text-foreground cursor-pointer'
                        : 'text-foreground-muted hover:bg-white/5 hover:text-foreground hover:-translate-y-0.5 hover:shadow-lg cursor-pointer'
                  }`}
                >
                  <StatusDot status={session.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{session.title}</div>
                    <div className="text-xs text-foreground-subtle truncate">
                      {isClosed ? 'Session ended' : formatRelativeTime(session.last_connected_at)}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-white/6">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-foreground">
            U
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">User</span>
            <span className="text-xs text-foreground-subtle">user@example.com</span>
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
            className="fixed inset-0 bg-background-deep/90 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-64 transform transition-transform">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu x={contextMenu.x} y={contextMenu.y} visible={contextMenu.visible}>
        <ContextMenuItem
          onClick={handleRename}
          disabled={
            contextMenu.sessionId
              ? sessions.find((s) => s.id === contextMenu.sessionId)?.status === 'closed'
              : true
          }
          aria-label="Rename session"
        >
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleDelete}
          disabled={
            contextMenu.sessionId
              ? sessions.find((s) => s.id === contextMenu.sessionId)?.status !== 'closed'
              : true
          }
          destructive
          aria-label="Delete session"
        >
          Delete
        </ContextMenuItem>
      </ContextMenu>
    </>
  );
}
