'use client';

import { Plus } from 'lucide-react';
import { TerminalClient } from '@/components/terminal/TerminalClient';
import { TerminalContainer } from '@/components/terminal/TerminalContainer';
import { TerminalHeader } from '@/components/terminal/TerminalHeader';
import { TerminalTabs } from '@/components/terminal/TerminalTabs';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { addTab } from '@/lib/store/tabsSlice';
import { Button } from '@/components/ui/button';

export default function TerminalPage() {
  const dispatch = useAppDispatch();
  const { tabs, activeTabId } = useAppSelector((state) => state.tabs);

  const handleNewTab = () => {
    dispatch(addTab({ ptyId: `pty-${Date.now()}` }));
  };

  if (tabs.length === 0) {
    return (
      <main className="flex h-full w-full flex-col bg-zinc-900 overflow-hidden">
        <TerminalHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-gray-400 text-lg">No terminal sessions open</div>
            <Button onClick={handleNewTab} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Terminal
            </Button>
            <p className="text-gray-600 text-sm">Or select a session from the sidebar</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full w-full flex-col bg-zinc-900 overflow-hidden">
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
