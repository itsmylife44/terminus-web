'use client';

import { useAppSelector } from '@/lib/store/hooks';

interface SessionEndedOverlayProps {
  onNewSession: () => void;
}

import { Button } from '@/components/ui/button';

export function SessionEndedOverlay({ onNewSession }: SessionEndedOverlayProps) {
  const { connectionStatus, exitCode } = useAppSelector((state) => state.terminal);

  if (connectionStatus !== 'disconnected' || exitCode === null) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-white">
      <div className="text-center space-y-6">
        <h2 className="text-2xl font-bold">Session Ended</h2>
        
        <div className="font-mono text-gray-400">
          Exit code: <span className={exitCode === 0 ? 'text-green-400' : 'text-red-400'}>{exitCode}</span>
        </div>

        <Button
          onClick={onNewSession}
          variant="secondary"
          size="lg"
          className="font-medium text-lg"
        >
          Start New Session
        </Button>
      </div>
    </div>
  );
}
