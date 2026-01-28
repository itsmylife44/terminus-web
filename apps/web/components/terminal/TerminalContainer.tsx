import type { ReactNode } from 'react';

interface TerminalContainerProps {
  children: ReactNode;
}

export function TerminalContainer({ children }: TerminalContainerProps) {
  return <div className="w-full h-full bg-zinc-900 p-0 overflow-hidden relative">{children}</div>;
}
