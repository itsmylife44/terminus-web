'use client';

import type { MouseEvent, KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { addTab, removeTab, setActiveTab } from '@/lib/store/tabsSlice';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TerminalTabs() {
  const dispatch = useAppDispatch();
  const { tabs, activeTabId } = useAppSelector((state) => state.tabs);

  const handleAddTab = () => {
    // Generate new ptyId (placeholder for now, will be real PTY later)
    dispatch(addTab({ ptyId: `pty-${Date.now()}` }));
  };

  const handleCloseTab = (e: MouseEvent, tabId: string) => {
    e.stopPropagation(); // Prevent activating tab when closing
    dispatch(removeTab(tabId));
  };

  const handleTabClick = (tabId: string) => {
    dispatch(setActiveTab(tabId));
  };

  const handleTabKeyDown = (e: KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dispatch(setActiveTab(tabId));
    }
  };

  return (
    <div className="flex items-center w-full h-10 bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center flex-1 h-full overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
            tabIndex={0}
            className={cn(
              'group relative flex items-center h-full min-w-[150px] max-w-[200px] px-3 border-r border-zinc-800 cursor-pointer select-none transition-colors',
              activeTabId === tab.id
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-800 text-gray-400 hover:bg-zinc-850 hover:text-gray-200'
            )}
            role="tab"
            aria-selected={activeTabId === tab.id}
          >
            {/* Active Indicator Top Border */}
            {activeTabId === tab.id && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500" />
            )}

            <span className="flex-1 text-xs truncate mr-2 font-medium">{tab.title}</span>

            <button
              type="button"
              onClick={(e) => handleCloseTab(e, tab.id)}
              className={cn(
                'p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10',
                activeTabId === tab.id
                  ? 'text-gray-300 hover:text-white'
                  : 'text-gray-500 hover:text-gray-300'
              )}
              aria-label="Close tab"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center px-2 h-full border-l border-zinc-800">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-sm text-gray-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50"
          onClick={handleAddTab}
          disabled={tabs.length >= 10}
          title={tabs.length >= 10 ? 'Maximum 10 tabs allowed' : 'New Tab'}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
