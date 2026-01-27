import { ReactNode } from 'react';

interface TerminalContainerProps {
  children: ReactNode;
}

export function TerminalContainer({ children }: TerminalContainerProps) {
  return (
    <div className="w-full h-full bg-[#1a1a1a] p-0 overflow-hidden relative">
      {children}
    </div>
  );
}
