'use client';

import "./globals.css";
import { ReduxProvider } from "@/lib/store/provider";
import AuthGate from "@/components/layout/AuthGate";
import { Sidebar } from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const showLayout = pathname !== '/login';

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
                  <main className="flex-1 p-4 md:p-6 bg-gray-950 overflow-y-auto">
                    {children}
                  </main>
                </div>
              </>
            ) : (
              <main>{children}</main>
            )}
          </AuthGate>
        </ReduxProvider>
      </body>
    </html>
  );
}
