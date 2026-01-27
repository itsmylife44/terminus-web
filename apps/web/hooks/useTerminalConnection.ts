'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { AttachAddon } from '@xterm/addon-attach';
import { useAppDispatch } from '@/lib/store/hooks';
import { setConnectionStatus, setError, setExitCode, resetReconnectAttempts } from '@/lib/store/terminalSlice';

export function useTerminalConnection(terminal: Terminal | null) {
  const dispatch = useAppDispatch();
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!terminal) return;

    dispatch(setConnectionStatus('connecting'));

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';
    socketRef.current = socket;

    socket.onopen = () => {
      dispatch(setConnectionStatus('connected'));
      dispatch(resetReconnectAttempts());

      const attachAddon = new AttachAddon(socket, { bidirectional: true });
      terminal.loadAddon(attachAddon);

      // Send initial size
      socket.send(JSON.stringify({
        type: 'resize',
        cols: terminal.cols,
        rows: terminal.rows
      }));

      terminal.focus();
    };

    socket.onmessage = (event) => {
      // Check for JSON control messages
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'exit') {
            dispatch(setExitCode(msg.code));
            terminal.writeln(`\r\n\x1b[33mSession ended (exit code: ${msg.code})\x1b[0m`);
          }
        } catch { /* Binary data, handled by AttachAddon */ }
      }
    };

    socket.onerror = () => {
      dispatch(setError('Connection error'));
    };

    socket.onclose = () => {
      dispatch(setConnectionStatus('disconnected'));
    };
  }, [terminal, dispatch]);

  // Send resize events
  useEffect(() => {
    if (!terminal) return;

    const disposable = terminal.onResize(({ cols, rows }) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    return () => disposable.dispose();
  }, [terminal]);

  return { connect, socket: socketRef };
}
