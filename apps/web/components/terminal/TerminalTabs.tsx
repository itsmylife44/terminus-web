'use client';

import type { MouseEvent, KeyboardEvent } from 'react';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { addTab, removeTab, setActiveTab } from '@/lib/store/tabsSlice';
import { closeSession } from '@/lib/store/ptySessionsSlice';
import type { PtySession } from '@/lib/store/ptySessionsSlice';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TakeoverDialog } from './TakeoverDialog';
import { takeoverPtySession } from '@/lib/api/pty-sessions';

export function TerminalTabs() {
  const dispatch = useAppDispatch();
  const { tabs, activeTabId } = useAppSelector((state) => state.tabs);
  const { sessions } = useAppSelector((state) => state.ptySessions);
  const [takeoverDialogOpen, setTakeoverDialogOpen] = useState(false);
  const [pendingTakeoverTab, setPendingTakeoverTab] = useState<{
    id: string;
    ptyId: string;
    title: string;
  } | null>(null);

  const handleAddTab = () => {
    dispatch(addTab({ ptyId: `pty-${Date.now()}` }));
  };

  const handleCloseTab = (e: MouseEvent, tabId: string) => {
    e.stopPropagation();
    dispatch(closeSession(tabId));
    dispatch(removeTab(tabId));
  };

  const handleTabClick = (tabId: string) => {
    const session = getSessionForTab(tabId);

    if (session?.occupied && activeTabId !== tabId) {
      setPendingTakeoverTab({
        id: tabId,
        ptyId: session.pty_id,
        title: session.title,
      });
      setTakeoverDialogOpen(true);
      return;
    }

    dispatch(setActiveTab(tabId));
  };

  const handleTabKeyDown = (e: KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabClick(tabId);
    }
  };

  const handleTakeoverConfirm = async () => {
    if (!pendingTakeoverTab) return;

    await takeoverPtySession(pendingTakeoverTab.ptyId);
    dispatch(setActiveTab(pendingTakeoverTab.id));
    setTakeoverDialogOpen(false);
    setPendingTakeoverTab(null);
  };

  const handleTakeoverCancel = () => {
    setTakeoverDialogOpen(false);
    setPendingTakeoverTab(null);
  };

  const getSessionForTab = (tabId: string): PtySession | undefined => {
    return sessions.find((s) => s.id === tabId);
  };

  return (
    <>
      <div className="flex items-center w-full h-10 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center flex-1 h-full overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const session = getSessionForTab(tab.id);
            const isOccupied = session?.occupied === true;

            return (
              <div
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                tabIndex={0}
                className={cn(
                  'group relative flex items-center h-full min-w-[150px] max-w-[200px] px-3 border-r border-zinc-800 cursor-pointer select-none transition-all duration-200',
                  activeTabId === tab.id
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-850 hover:text-gray-200'
                )}
                role="tab"
                aria-selected={activeTabId === tab.id}
                data-occupied={isOccupied}
              >
                {activeTabId === tab.id && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500" />
                )}

                <span className="flex-1 text-xs truncate mr-2 font-medium">{tab.title}</span>

                {isOccupied && (
                  <span
                    className="w-2 h-2 bg-red-500 rounded-full mr-1"
                    title="Session in use on another device"
                  />
                )}

                <button
                  type="button"
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className={cn(
                    'p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white/10 active:scale-[0.98]',
                    activeTabId === tab.id
                      ? 'text-gray-300 hover:text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  )}
                  aria-label="Close tab"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center px-2 h-full border-l border-zinc-800">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-sm text-gray-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
            onClick={handleAddTab}
            disabled={tabs.length >= 10}
            title={tabs.length >= 10 ? 'Maximum 10 tabs allowed' : 'New Tab'}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <TakeoverDialog
        isOpen={takeoverDialogOpen}
        onConfirm={handleTakeoverConfirm}
        onCancel={handleTakeoverCancel}
        sessionTitle={pendingTakeoverTab?.title || ''}
      />
    </>
  );
}
