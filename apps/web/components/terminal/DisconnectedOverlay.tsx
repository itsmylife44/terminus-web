'use client';

import { useEffect, useState } from 'react';
import { useAppSelector } from '@/lib/store/hooks';

interface DisconnectedOverlayProps {
  onReconnect: () => void;
}

import { Button } from '@/components/ui/button';

export function DisconnectedOverlay({ onReconnect }: DisconnectedOverlayProps) {
  const { connectionStatus, reconnectAttempts } = useAppSelector((state) => state.terminal);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (connectionStatus !== 'reconnecting') return;

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 16000);
    setCountdown(Math.ceil(delay / 1000));

    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionStatus, reconnectAttempts]);

  if (connectionStatus !== 'reconnecting' && connectionStatus !== 'disconnected') {
    return null;
  }

  const isGivenUp = reconnectAttempts >= 5;

  if (connectionStatus === 'disconnected' && reconnectAttempts === 0) {
      return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-white">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-red-400">Connection Lost</h2>
        
          {isGivenUp ? (
          <div className="space-y-4">
            <p className="text-gray-300">Maximum reconnection attempts reached.</p>
            <Button
              onClick={onReconnect}
              variant="secondary"
              className="font-medium"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-300">
              Reconnecting in <span className="font-mono font-bold text-white">{countdown}s</span>...
            </p>
            <p className="text-sm text-gray-500">Attempt {reconnectAttempts}/5</p>
            <Button
              onClick={onReconnect}
              variant="secondary"
              size="sm"
              className="mt-2"
            >
              Reconnect Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
