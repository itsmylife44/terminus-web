'use client';

import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { deletePtySession, renamePtySession, type PtySession } from '@/lib/store/ptySessionsSlice';
import { addTab, setActiveTab, updateTabTitle, removeTab } from '@/lib/store/tabsSlice';
import { SessionDeleteDialog } from './SessionDeleteDialog';
import { showToast } from '@/components/ui/toast';

// Icons
const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="transition-transform duration-200"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

interface SessionManagerProps {
  onClose?: () => void;
}

/**
 * Get status icon for session
 */
function getStatusIcon(status: string): string {
  const icons = {
    active: '🟢',
    disconnected: '🟡',
    closed: '🔴',
  };
  return icons[status as keyof typeof icons] || '⚪';
}

export function SessionManager({ onClose }: SessionManagerProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { sessions } = useAppSelector((state) => state.ptySessions);
  const { tabs } = useAppSelector((state) => state.tabs);

  const [isExpanded, setIsExpanded] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    sessionName: string;
  }>({ isOpen: false, sessionId: null, sessionName: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Count active sessions (not closed)
  const activeSessions = sessions.filter((s) => s.status !== 'closed');
  const activeCount = activeSessions.length;

  const handleSessionClick = (session: PtySession) => {
    if (session.status === 'closed') return;

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

    router.push('/terminal');
    onClose?.();
  };

  const handleDeleteClick = (e: MouseEvent, session: PtySession) => {
    e.stopPropagation();
    setDeleteDialog({
      isOpen: true,
      sessionId: session.id,
      sessionName: session.title,
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.sessionId) {
      try {
        await dispatch(deletePtySession(deleteDialog.sessionId)).unwrap();

        // Find and close the corresponding tab
        const deletedSession = sessions.find((s) => s.id === deleteDialog.sessionId);
        if (deletedSession) {
          const tabToClose = tabs.find(
            (t) => t.id === deletedSession.id || t.ptyId === deletedSession.pty_id
          );
          if (tabToClose) {
            dispatch(removeTab(tabToClose.id));
          }
        }

        showToast(`Session "${deleteDialog.sessionName}" deleted`, 'success');
      } catch (error) {
        showToast('Failed to delete session', 'error');
        console.error('Failed to delete session:', error);
      }
    }
    setDeleteDialog({ isOpen: false, sessionId: null, sessionName: '' });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, sessionId: null, sessionName: '' });
  };

  const handleRenameClick = (e: MouseEvent, session: PtySession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditValue(session.title);
  };

  const handleRenameSubmit = async (sessionId: string) => {
    if (editValue.trim() && editValue !== sessions.find((s) => s.id === sessionId)?.title) {
      try {
        await dispatch(renamePtySession({ id: sessionId, title: editValue.trim() })).unwrap();

        const session = sessions.find((s) => s.id === sessionId);
        if (session) {
          const openTab = tabs.find((t) => t.id === session.id || t.ptyId === session.pty_id);
          if (openTab) {
            dispatch(updateTabTitle({ id: openTab.id, title: editValue.trim() }));
          }
        }
        showToast('Session renamed successfully', 'success');
      } catch (error) {
        showToast('Failed to rename session', 'error');
        console.error('Failed to rename session:', error);
      }
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(sessionId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleNewSession = () => {
    const newSessionId = `session-${Date.now()}`;
    const newPtyId = `pty-${Date.now()}`;

    dispatch(
      addTab({
        id: newSessionId,
        ptyId: newPtyId,
        title: `Terminal ${sessions.length + 1}`,
      })
    );

    router.push('/terminal');
    onClose?.();
  };

  return (
    <>
      <div className="flex flex-col border-t border-white/6">
        {/* Header */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors duration-200"
        >
          <span className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">
            Sessions ({activeCount})
          </span>
          <span className={isExpanded ? 'rotate-0' : '-rotate-90'}>
            <ChevronDownIcon />
          </span>
        </button>

        {/* Sessions List */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-1 overflow-y-auto max-h-[300px]">
            {activeSessions.length === 0 ? (
              <div className="px-3 py-4 text-center text-foreground-subtle text-xs">
                No active sessions
              </div>
            ) : (
              activeSessions.map((session) => {
                const isOpenInTab = tabs.some(
                  (t) => t.id === session.id || t.ptyId === session.pty_id
                );
                const isClosed = session.status === 'closed';

                return (
                  <button
                    key={session.id}
                    type="button"
                    className={`group w-full flex items-center gap-2 rounded-md px-3 py-2 transition-all duration-200 text-left ${
                      isClosed
                        ? 'opacity-60 cursor-not-allowed'
                        : isOpenInTab
                          ? 'bg-white/10'
                          : 'hover:bg-white/5 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer'
                    }`}
                    onClick={() => !isClosed && handleSessionClick(session)}
                    disabled={isClosed}
                  >
                    {/* Status Icon */}
                    <span className="text-sm flex-shrink-0">{getStatusIcon(session.status)}</span>

                    {/* Session Name */}
                    <div className="flex-1 min-w-0">
                      {editingId === session.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleRenameSubmit(session.id)}
                          onKeyDown={(e) => handleRenameKeyDown(e, session.id)}
                          className="w-full bg-background-base border border-white/10 rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="text-sm font-medium text-foreground truncate">
                          {session.title}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {!isClosed && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {/* Rename Button */}
                        <button
                          type="button"
                          onClick={(e) => handleRenameClick(e, session)}
                          className="p-1 rounded hover:bg-white/10 transition-colors duration-200"
                          title="Rename session"
                          aria-label="Rename session"
                        >
                          <span className="text-xs">✏️</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(e, session)}
                          className="p-1 rounded hover:bg-red-500/10 transition-colors duration-200"
                          title="Close session"
                          aria-label="Close session"
                        >
                          <span className="text-xs">❌</span>
                        </button>
                      </div>
                    )}
                  </button>
                );
              })
            )}

            {/* New Session Button */}
            <button
              type="button"
              onClick={handleNewSession}
              className="w-full flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-white/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg border border-white/6 hover:border-white/10"
            >
              <PlusIcon />
              <span>New Session</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <SessionDeleteDialog
        isOpen={deleteDialog.isOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        sessionName={deleteDialog.sessionName}
      />
    </>
  );
}
