import "./globals.css";
import type { Metadata } from "next";
import { ReduxProvider } from "@/lib/store/provider";
import AuthGate from "@/components/layout/AuthGate";

export const metadata: Metadata = {
  title: "Terminus Web",
  description: "Advanced web terminal interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen font-sans">
        <ReduxProvider>
          <AuthGate>{children}</AuthGate>
        </ReduxProvider>
      </body>
    </html>
  );
}
