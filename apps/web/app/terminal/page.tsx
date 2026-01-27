'use client';

import { useEffect } from 'react';
import { TerminalClient } from '@/components/terminal/TerminalClient';
import { TerminalContainer } from '@/components/terminal/TerminalContainer';
import { TerminalHeader } from '@/components/terminal/TerminalHeader';
import { TerminalTabs } from '@/components/terminal/TerminalTabs';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { addTab } from '@/lib/store/tabsSlice';

export default function TerminalPage() {
  const dispatch = useAppDispatch();
  const { tabs, activeTabId } = useAppSelector((state) => state.tabs);

  // Initialize with one tab if none exist
  useEffect(() => {
    if (tabs.length === 0) {
      dispatch(addTab({ ptyId: `pty-${Date.now()}` }));
    }
  }, [tabs.length, dispatch]);

  return (
    <main className="flex h-full w-full flex-col bg-[#1a1a1a] overflow-hidden">
      <TerminalHeader />
      <TerminalTabs />
      <div className="flex-1 overflow-hidden relative">
        <TerminalContainer>
          {tabs.map((tab) => {
            // Check if this is a new tab (placeholder ptyId) or reconnecting to existing session
            const isPlaceholder = tab.ptyId.startsWith('pty-');

            return (
              <div
                key={tab.id}
                className="w-full h-full"
                style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
              >
                <TerminalClient
                  tabId={tab.id}
                  existingPtyId={isPlaceholder ? undefined : tab.ptyId}
                  isActive={tab.id === activeTabId}
                />
              </div>
            );
          })}
        </TerminalContainer>
      </div>
      <div className="px-2 py-1 bg-gray-900 border-t border-gray-700 text-xs text-gray-500 text-center shrink-0">
        Ctrl+Shift+C to copy, Ctrl+Shift+V to paste
      </div>
    </main>
  );
}
