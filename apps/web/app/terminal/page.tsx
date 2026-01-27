import { TerminalClient } from '@/components/terminal/TerminalClient';
import { TerminalContainer } from '@/components/terminal/TerminalContainer';
import { TerminalHeader } from '@/components/terminal/TerminalHeader';

export default function TerminalPage() {
  return (
    <main className="flex h-screen w-screen flex-col bg-[#1a1a1a] overflow-hidden">
      <TerminalHeader />
      <div className="flex-1 overflow-hidden relative">
        <TerminalContainer>
          <TerminalClient />
        </TerminalContainer>
      </div>
      <div className="px-4 py-1 bg-gray-900 border-t border-gray-700 text-xs text-gray-500 text-center shrink-0">
        Ctrl+Shift+C to copy, Ctrl+Shift+V to paste
      </div>
    </main>
  );
}
