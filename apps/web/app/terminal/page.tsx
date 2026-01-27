import { TerminalClient } from '@/components/terminal/TerminalClient';
import { TerminalContainer } from '@/components/terminal/TerminalContainer';

export default function TerminalPage() {
  return (
    <main className="flex h-screen w-screen flex-col bg-[#1a1a1a] overflow-hidden">
      <TerminalContainer>
        <TerminalClient />
      </TerminalContainer>
    </main>
  );
}
