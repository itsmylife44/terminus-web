'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Terminal } from 'ghostty-web';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { getPtyBaseUrl } from '@/lib/utils';
import {
  setConnectionStatus,
  setError,
  setExitCode,
  resetReconnectAttempts,
  incrementReconnectAttempts,
} from '@/lib/store/terminalSlice';

export function useTerminalConnection(terminal: Terminal | null, initialPtyId?: string) {
  const dispatch = useAppDispatch();
  const { reconnectAttempts, connectionStatus } = useAppSelector((state) => state.terminal);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyClosedRef = useRef(false);
  const ptyIdRef = useRef<string | null>(initialPtyId || null);

  const connect = useCallback(async () => {
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

    const baseUrl = getPtyBaseUrl();

    try {
      const opencodeCommand = process.env.NEXT_PUBLIC_OPENCODE_COMMAND || undefined;

      const response = await fetch(`${baseUrl}/pty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cols: terminal.cols,
          rows: terminal.rows,
          ...(opencodeCommand && { command: opencodeCommand }),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create PTY: ${response.status}`);
      }

      const ptySession = await response.json();
      ptyIdRef.current = ptySession.id;

      const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
      const wsHost = baseUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${wsHost}/pty/${ptySession.id}/connect`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = async () => {
        dispatch(setConnectionStatus('connected'));
        dispatch(resetReconnectAttempts());

        await fetch(`${baseUrl}/pty/${ptySession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ size: { cols: terminal.cols, rows: terminal.rows } }),
        }).catch(() => {});

        terminal.focus();
      };

      socket.onmessage = (event) => {
        terminal.write(event.data);
      };

      socket.onerror = () => {
        dispatch(setError('Connection error'));
      };

      socket.onclose = (event) => {
        if (isManuallyClosedRef.current) {
          dispatch(setConnectionStatus('disconnected'));
          return;
        }

        if (event.code === 1000) {
          dispatch(setExitCode(0));
          dispatch(setConnectionStatus('disconnected'));
          terminal.writeln('\r\n\x1b[33mSession ended\x1b[0m');
        } else {
          dispatch(setConnectionStatus('reconnecting'));
          dispatch(incrementReconnectAttempts());
        }
      };

      terminal.onData((data) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      });
    } catch (err) {
      console.error('[PTY] Error:', err);
      dispatch(setError('Failed to create PTY session'));
      dispatch(setConnectionStatus('disconnected'));
    }
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

    const baseUrl = getPtyBaseUrl();

    const disposable = terminal.onResize(({ cols, rows }) => {
      if (ptyIdRef.current) {
        fetch(`${baseUrl}/pty/${ptyIdRef.current}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ size: { cols, rows } }),
        }).catch(console.error);
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
