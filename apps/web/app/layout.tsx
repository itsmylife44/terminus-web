'use client';

import './globals.css';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ReduxProvider } from '@/lib/store/provider';
import AuthGate from '@/components/layout/AuthGate';
import { Sidebar } from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Pages that handle their own layout
  const noLayoutPages = ['/login', '/terminal'];
  const showLayout = !noLayoutPages.some(
    (page) => pathname === page || pathname.startsWith(page + '/')
  );

  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen font-sans">
        <ReduxProvider>
          <AuthGate>
            {showLayout ? (
              <>
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <div className="flex flex-col min-h-screen md:ml-64 transition-all duration-300">
                  <Header onMenuClick={() => setIsSidebarOpen(true)} />
                  <main className="flex-1 p-4 md:p-6 bg-gray-950 overflow-y-auto">{children}</main>
                </div>
              </>
            ) : (
              <main className="min-h-screen">{children}</main>
            )}
          </AuthGate>
        </ReduxProvider>
      </body>
    </html>
  );
}
