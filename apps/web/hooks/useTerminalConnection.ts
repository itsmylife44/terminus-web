'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Terminal } from 'ghostty-web';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { getPtyBaseUrl, getBasicAuthHeader, getAuthenticatedWsUrl } from '@/lib/utils';
import {
  setConnectionStatus,
  setError,
  setExitCode,
  resetReconnectAttempts,
  incrementReconnectAttempts,
} from '@/lib/store/terminalSlice';
import { updateTabPtyId, setTabConnected } from '@/lib/store/tabsSlice';
import {
  createPtySession,
  updatePtySession,
  disconnectSession,
} from '@/lib/store/ptySessionsSlice';

interface UseTerminalConnectionOptions {
  tabId: string; // Tab ID (also used as DB session ID)
  existingPtyId?: string; // If reconnecting to existing PTY
}

export function useTerminalConnection(
  terminal: Terminal | null,
  options: UseTerminalConnectionOptions
) {
  const { tabId, existingPtyId } = options;
  const dispatch = useAppDispatch();
  const { reconnectAttempts, connectionStatus } = useAppSelector((state) => state.terminal);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyClosedRef = useRef(false);
  const ptyIdRef = useRef<string | null>(existingPtyId || null);
  const isReconnectRef = useRef(!!existingPtyId);

  const connect = useCallback(async () => {
    if (!terminal) return;

    // Close existing connection
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
    const authHeader = getBasicAuthHeader();

    try {
      let ptyId = ptyIdRef.current;

      // If we have an existing PTY ID, try to reconnect
      // Otherwise, create a new PTY session
      if (!ptyId || !isReconnectRef.current) {
        const opencodeCommand = process.env.NEXT_PUBLIC_OPENCODE_COMMAND || undefined;

        const response = await fetch(`${baseUrl}/pty`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader && { Authorization: authHeader }),
          },
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
        ptyId = ptySession.id;
        ptyIdRef.current = ptyId;
        isReconnectRef.current = false;

        // Update tab with the real PTY ID
        dispatch(updateTabPtyId({ id: tabId, ptyId: ptyId! }));

        // Save session to database
        dispatch(
          createPtySession({
            id: tabId,
            pty_id: ptyId!,
            title: `Terminal`,
            cols: terminal.cols,
            rows: terminal.rows,
          })
        );
      }

      // Connect WebSocket
      const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
      const wsHost = baseUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${wsHost}/pty/${ptyId}/connect`;
      const authenticatedWsUrl = getAuthenticatedWsUrl(wsUrl);

      const socket = new WebSocket(authenticatedWsUrl);
      socketRef.current = socket;

      socket.onopen = async () => {
        dispatch(setConnectionStatus('connected'));
        dispatch(resetReconnectAttempts());
        dispatch(setTabConnected({ id: tabId, isConnected: true }));

        // Update session status in database
        dispatch(
          updatePtySession({
            id: tabId,
            input: { status: 'active' },
          })
        );

        // Send initial resize
        await fetch(`${baseUrl}/pty/${ptyId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader && { Authorization: authHeader }),
          },
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
        dispatch(setTabConnected({ id: tabId, isConnected: false }));

        if (isManuallyClosedRef.current) {
          dispatch(setConnectionStatus('disconnected'));
          // Mark session as disconnected in DB
          dispatch(disconnectSession(tabId));
          return;
        }

        if (event.code === 1000) {
          dispatch(setExitCode(0));
          dispatch(setConnectionStatus('disconnected'));
          terminal.writeln('\r\n\x1b[33mSession ended\x1b[0m');
          // Mark session as closed in DB
          dispatch(
            updatePtySession({
              id: tabId,
              input: { status: 'closed' },
            })
          );
        } else {
          dispatch(setConnectionStatus('reconnecting'));
          dispatch(incrementReconnectAttempts());
          // Mark session as disconnected in DB
          dispatch(disconnectSession(tabId));
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
      dispatch(setTabConnected({ id: tabId, isConnected: false }));

      // If reconnect failed, the PTY might be dead - mark as closed
      if (isReconnectRef.current) {
        dispatch(
          updatePtySession({
            id: tabId,
            input: { status: 'closed' },
          })
        );
        isReconnectRef.current = false;
      }
    }
  }, [terminal, dispatch, tabId]);

  // Auto-reconnect logic
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

  // Handle terminal resize
  useEffect(() => {
    if (!terminal) return;

    const baseUrl = getPtyBaseUrl();

    const disposable = terminal.onResize(({ cols, rows }) => {
      if (ptyIdRef.current) {
        const authHeader = getBasicAuthHeader();
        fetch(`${baseUrl}/pty/${ptyIdRef.current}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader && { Authorization: authHeader }),
          },
          body: JSON.stringify({ size: { cols, rows } }),
        }).catch(console.error);
      }
    });

    return () => disposable.dispose();
  }, [terminal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isManuallyClosedRef.current = true;
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return { connect, socket: socketRef, ptyId: ptyIdRef };
}
