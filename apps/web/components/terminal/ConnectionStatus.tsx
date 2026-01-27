'use client';

import { useAppSelector } from '@/lib/store/hooks';

export function ConnectionStatus() {
  const { connectionStatus } = useAppSelector((state) => state.terminal);

  const statusConfig = {
    connected: { color: 'bg-green-500', text: 'Connected' },
    connecting: { color: 'bg-yellow-500', text: 'Connecting...' },
    reconnecting: { color: 'bg-yellow-500', text: 'Reconnecting...' },
    disconnected: { color: 'bg-red-500', text: 'Disconnected' },
  };

  const { color, text } = statusConfig[connectionStatus] || statusConfig.disconnected;
  const showSpinner = connectionStatus === 'connecting' || connectionStatus === 'reconnecting';

  return (
    <div className="flex items-center gap-2">
      {showSpinner ? (
        <div className="w-2 h-2 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className={`w-2 h-2 rounded-full ${color}`} />
      )}
      <span className="text-sm text-gray-300">{text}</span>
    </div>
  );
}
