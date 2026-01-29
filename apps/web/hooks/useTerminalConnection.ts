'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Terminal } from 'ghostty-web';
import { apiRequest } from '@/lib/utils/api-request';
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
  const terminalRef = useRef<Terminal | null>(null);
  const connectRef = useRef<(() => Promise<void>) | null>(null);
  const onDataDisposableRef = useRef<{ dispose: () => void } | null>(null);

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
      let needsNewSession = !ptyId || !isReconnectRef.current;

      // If we have an existing PTY ID, verify it still exists on the backend
      if (ptyId && isReconnectRef.current) {
        try {
          await apiRequest<void>(`${baseUrl}/pty/${ptyId}`, {
            method: 'PUT',
            headers: authHeader ? { Authorization: authHeader } : undefined,
            body: JSON.stringify({ size: { cols: terminal.cols, rows: terminal.rows } }),
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes('404')) {
            needsNewSession = true;
          }
        }
      }

      if (needsNewSession) {
        terminal.clear();

        const opencodeCommand = process.env.NEXT_PUBLIC_OPENCODE_COMMAND || undefined;

        interface PtySession {
          id: string;
          [key: string]: unknown;
        }

        const ptySession = await apiRequest<PtySession>(`${baseUrl}/pty`, {
          method: 'POST',
          headers: authHeader ? { Authorization: authHeader } : undefined,
          body: JSON.stringify({
            cols: terminal.cols,
            rows: terminal.rows,
            ...(opencodeCommand && { command: opencodeCommand }),
          }),
        });
        ptyId = ptySession.id;
        ptyIdRef.current = ptyId;
        isReconnectRef.current = true;

        // Update tab with the real PTY ID
        dispatch(updateTabPtyId({ id: tabId, ptyId: ptyId! }));

        // Save session to database (UPSERT - updates if exists)
        dispatch(
          createPtySession({
            id: tabId,
            pty_id: ptyId!,
            title: `Terminal`,
            cols: terminal.cols,
            rows: terminal.rows,
          })
        );
      } else {
        // Fetch scrollback before reconnecting (not on fresh session)
        try {
          const scrollback = await apiRequest<string>(`${baseUrl}/pty/${ptyId}/scrollback`, {
            headers: authHeader ? { Authorization: authHeader } : undefined,
          });
          if (scrollback) {
            terminal.write(scrollback);
          }
        } catch (err) {
          console.warn('[PTY] Failed to fetch scrollback:', err);
          // Continue with connection even if scrollback fetch fails
        }
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

        // Send resize to trigger TUI redraw (SIGWINCH)
        apiRequest<void>(`${baseUrl}/pty/${ptyId}`, {
          method: 'PUT',
          headers: authHeader ? { Authorization: authHeader } : undefined,
          body: JSON.stringify({ size: { cols: terminal.cols, rows: terminal.rows } }),
        }).catch(() => {});

        // For reconnecting to existing TUI sessions, trigger resize to force TUI redraw
        if (!needsNewSession) {
          setTimeout(async () => {
            // Send slightly different size, then correct size to trigger SIGWINCH
            apiRequest<void>(`${baseUrl}/pty/${ptyId}`, {
              method: 'PUT',
              headers: authHeader ? { Authorization: authHeader } : undefined,
              body: JSON.stringify({ size: { cols: terminal.cols - 1, rows: terminal.rows } }),
            }).catch(() => {});

            setTimeout(async () => {
              apiRequest<void>(`${baseUrl}/pty/${ptyId}`, {
                method: 'PUT',
                headers: authHeader ? { Authorization: authHeader } : undefined,
                body: JSON.stringify({ size: { cols: terminal.cols, rows: terminal.rows } }),
              }).catch(() => {});
            }, 50);
          }, 100);
        }

        terminal.focus();
      };

      socket.binaryType = 'arraybuffer';

      socket.onmessage = (event) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            terminalRef.current?.write(new Uint8Array(event.data));
          } else {
            terminalRef.current?.write(event.data);
          }
        } catch (err) {
          console.error('[PTY] Write error:', err);
        }
      };

      socket.onerror = () => {
        dispatch(setError('Connection error'));
      };

      socket.onclose = (event) => {
        dispatch(setTabConnected({ id: tabId, isConnected: false }));

        if (isManuallyClosedRef.current) {
          dispatch(setConnectionStatus('disconnected'));
          return;
        }

        if (event.code === 1000) {
          dispatch(setExitCode(0));
          dispatch(setConnectionStatus('disconnected'));
          terminalRef.current?.writeln('\r\n\x1b[33mSession ended\x1b[0m');
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

      // Dispose previous listener if any (prevents duplicate listeners on reconnect)
      onDataDisposableRef.current?.dispose();

      // Set up new listener using socketRef (not the local socket variable)
      onDataDisposableRef.current = terminal.onData((data) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(data);
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

  // Sync terminal to ref for fresh reference in socket handlers
  useEffect(() => {
    terminalRef.current = terminal;
  }, [terminal]);

  // Sync connect to ref for fresh reference in reconnect timeout
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Auto-reconnect logic
  useEffect(() => {
    if (connectionStatus === 'reconnecting') {
      if (reconnectAttempts > 5) {
        return;
      }

      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 16000);

      reconnectTimeoutRef.current = setTimeout(() => {
        connectRef.current?.();
      }, delay);

      return () => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      };
    }
  }, [connectionStatus, reconnectAttempts]);

  // Handle terminal resize
  useEffect(() => {
    if (!terminal) return;

    const baseUrl = getPtyBaseUrl();

    const disposable = terminal.onResize(({ cols, rows }) => {
      if (ptyIdRef.current) {
        const authHeader = getBasicAuthHeader();
        apiRequest<void>(`${baseUrl}/pty/${ptyIdRef.current}`, {
          method: 'PUT',
          headers: authHeader ? { Authorization: authHeader } : undefined,
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
      onDataDisposableRef.current?.dispose();
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return { connect, socket: socketRef, ptyId: ptyIdRef };
}
