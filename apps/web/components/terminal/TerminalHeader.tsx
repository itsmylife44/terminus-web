'use client';

import { ConnectionStatus } from './ConnectionStatus';

export function TerminalHeader() {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background-elevated/50 backdrop-blur-md border-b border-white/6 shrink-0">
      <h1 className="text-foreground font-semibold text-sm tracking-wide">Terminus</h1>
      <ConnectionStatus />
    </div>
  );
}
