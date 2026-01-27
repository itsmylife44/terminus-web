'use client';

import { ConnectionStatus } from './ConnectionStatus';

export function TerminalHeader() {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
      <h1 className="text-white font-semibold text-sm tracking-wide">Terminus</h1>
      <ConnectionStatus />
    </div>
  );
}
