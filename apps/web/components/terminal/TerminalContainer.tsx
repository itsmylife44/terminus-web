import { ReactNode } from 'react';

interface TerminalContainerProps {
  children: ReactNode;
}

export function TerminalContainer({ children }: TerminalContainerProps) {
  return (
    <div className="w-full h-full bg-[#1a1a1a] p-4 overflow-hidden">
      {children}
    </div>
  );
}
