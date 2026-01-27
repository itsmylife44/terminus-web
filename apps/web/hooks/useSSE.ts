import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { updateSession } from '@/lib/store/sessionsSlice';
import { OpenCodeSession } from '@/lib/api/client';

interface SSEEvent {
  type: string;
  data?: unknown;
  [key: string]: unknown;
}

/**
 * useSSE Hook for real-time session updates via Server-Sent Events
 *
 * Features:
 * - Single global SSE connection (prevents multiple connections)
 * - Automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)
 * - Parses session update events and dispatches Redux actions
 * - Handles heartbeat (30s) to detect stale connections
 * - Cleanup on component unmount or auth changes
 *
 * Usage:
 * ```tsx
 * function Dashboard() {
 *   useSSE();
 *   return <div>...</div>;
 * }
 * ```
 */
export function useSSE() {
  const dispatch = useDispatch<AppDispatch>();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate reconnection delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const exponentialDelay = baseDelay * Math.pow(2, reconnectAttemptsRef.current);
    return Math.min(exponentialDelay, maxDelay);
  }, []);

  // Handle SSE event from server
  const handleSSEEvent = useCallback(
    (event: Event) => {
      if (!(event instanceof MessageEvent)) return;

      try {
        const sseEvent: SSEEvent = JSON.parse(event.data);

        // Handle session update events
        if (sseEvent.type === 'session_update' && sseEvent.data) {
          const sessionUpdate = sseEvent.data as Partial<OpenCodeSession> & { id: string };
          dispatch(
            updateSession({
              id: sessionUpdate.id,
              updates: sessionUpdate,
            })
          );
        }

        // Handle session_created event
        if (sseEvent.type === 'session_created' && sseEvent.data) {
          const newSession = sseEvent.data as OpenCodeSession;
          // Session creation is handled separately - may need to refetch list
          // or dispatch an add session action if needed
          console.debug('[SSE] Session created:', newSession.id);
        }

        // Handle session_closed event
        if (sseEvent.type === 'session_closed' && sseEvent.data) {
          const closedSessionId = (sseEvent.data as { id: string }).id;
          dispatch(
            updateSession({
              id: closedSessionId,
              updates: { state: 'closed', status: 'completed' },
            })
          );
        }

        // Reset heartbeat timeout on any event
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn('[SSE] Heartbeat timeout - reconnecting');
          closeSSE();
          connectSSE();
        }, 35000); // 35s timeout (slightly more than 30s heartbeat)
      } catch (error) {
        console.error('[SSE] Failed to parse event:', error, event);
      }
    },
    [dispatch]
  );

  // Close SSE connection
  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Connect to SSE endpoint
  const connectSSE = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (eventSourceRef.current) {
      console.debug('[SSE] Connection already exists');
      return;
    }

    try {
      // Get auth headers to pass in EventSource (via fetch approach)
      const authData =
        typeof window !== 'undefined' ? sessionStorage.getItem('opencode_auth') : null;

      if (!authData) {
        console.debug('[SSE] No auth credentials, skipping SSE connection');
        return;
      }

      const endpoint = '/api/opencode/event';
      const eventSource = new EventSource(endpoint, { withCredentials: true });

      eventSource.addEventListener('message', handleSSEEvent);

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        closeSSE();

        // Implement exponential backoff reconnection
        reconnectAttemptsRef.current += 1;
        const delay = getReconnectDelay();
        console.debug(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, delay);
      };

      eventSource.addEventListener('open', () => {
        console.debug('[SSE] Connected');
        reconnectAttemptsRef.current = 0; // Reset on successful connection

        // Set heartbeat timeout
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn('[SSE] Heartbeat timeout - reconnecting');
          closeSSE();
          connectSSE();
        }, 35000);
      });

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      reconnectAttemptsRef.current += 1;
      const delay = getReconnectDelay();
      reconnectTimeoutRef.current = setTimeout(() => {
        connectSSE();
      }, delay);
    }
  }, [handleSSEEvent, closeSSE, getReconnectDelay]);

  // Initialize on mount and cleanup on unmount
  useEffect(() => {
    connectSSE();

    // Listen for auth errors and disconnect
    const handleAuthError = () => {
      console.debug('[SSE] Auth error detected, closing connection');
      closeSSE();
    };

    window.addEventListener('opencode:auth_error', handleAuthError);

    return () => {
      window.removeEventListener('opencode:auth_error', handleAuthError);
      closeSSE();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectSSE, closeSSE]);
}
