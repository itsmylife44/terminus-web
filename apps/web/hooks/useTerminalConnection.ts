'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { AttachAddon } from '@xterm/addon-attach';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { setConnectionStatus, setError, setExitCode, resetReconnectAttempts, incrementReconnectAttempts } from '@/lib/store/terminalSlice';

export function useTerminalConnection(terminal: Terminal | null) {
  const dispatch = useAppDispatch();
  const { reconnectAttempts, connectionStatus } = useAppSelector((state) => state.terminal);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyClosedRef = useRef(false);

  const connect = useCallback(() => {
    if (!terminal) return;

    if (socketRef.current) {
      isManuallyClosedRef.current = true;
      socketRef.current.close();
      socketRef.current = null;
      isManuallyClosedRef.current = false;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    dispatch(setConnectionStatus('connecting'));

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';
    socketRef.current = socket;

    socket.onopen = () => {
      dispatch(setConnectionStatus('connected'));
      dispatch(resetReconnectAttempts());
      terminal.reset();

      const attachAddon = new AttachAddon(socket, { bidirectional: true });
      terminal.loadAddon(attachAddon);

      socket.send(JSON.stringify({
        type: 'resize',
        cols: terminal.cols,
        rows: terminal.rows
      }));

      terminal.focus();
    };

    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'exit') {
            isManuallyClosedRef.current = true;
            dispatch(setExitCode(msg.code));
            dispatch(setConnectionStatus('disconnected'));
            terminal.writeln(`\r\n\x1b[33mSession ended (exit code: ${msg.code})\x1b[0m`);
            socket.close();
          }
        } catch { /* Binary data */ }
      }
    };

    socket.onerror = () => {
      dispatch(setError('Connection error'));
    };

    socket.onclose = () => {
      if (isManuallyClosedRef.current) {
         dispatch(setConnectionStatus('disconnected'));
         return;
      }

      dispatch(setConnectionStatus('reconnecting'));
      dispatch(incrementReconnectAttempts());
    };
  }, [terminal, dispatch]);

  useEffect(() => {
    if (connectionStatus === 'reconnecting') {
      if (reconnectAttempts > 5) {
         return;
      }

      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 16000);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);

      return () => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      };
    }
  }, [connectionStatus, reconnectAttempts, connect]);

  useEffect(() => {
    if (!terminal) return;

    const disposable = terminal.onResize(({ cols, rows }) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    return () => disposable.dispose();
  }, [terminal]);

  useEffect(() => {
    return () => {
      isManuallyClosedRef.current = true;
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return { connect, socket: socketRef };
}
