import "./globals.css";
import type { Metadata } from "next";
import { ReduxProvider } from "@/lib/store/provider";

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
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
