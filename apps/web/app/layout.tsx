import "./globals.css";
import type { Metadata } from "next";

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
        {children}
      </body>
    </html>
  );
}
