'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';

/**
 * Terminal-specific layout
 * - Keeps sidebar for navigation
 * - NO padding around terminal for full-screen experience
 * - Terminal fills remaining space after sidebar
 */
export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Mobile menu button - fixed position */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 rounded-md bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors backdrop-blur-sm"
      >
        <span className="sr-only">Open menu</span>
        <svg
          className="h-5 w-5"
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

      {/* Terminal content - full height, offset by sidebar on desktop */}
      <div className="h-screen md:ml-64 bg-[#1a1a1a]">{children}</div>
    </>
  );
}
