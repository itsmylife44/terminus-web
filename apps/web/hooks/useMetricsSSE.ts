import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/lib/store/hooks';
import { updateMetrics } from '@/lib/store/metricsSlice';

/**
 * Hook for real-time system metrics via Server-Sent Events
 * Connects to /api/metrics/stream endpoint and dispatches updates to Redux
 */
export default function useMetricsSSE() {
  const dispatch = useAppDispatch();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Calculate reconnection delay with exponential backoff
  const getReconnectDelay = () => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const exponentialDelay = baseDelay * Math.pow(2, reconnectAttemptsRef.current);
    return Math.min(exponentialDelay, maxDelay);
  };

  // Close SSE connection
  const closeSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // Connect to SSE endpoint
  const connectSSE = () => {
    // Prevent multiple simultaneous connections
    if (eventSourceRef.current) {
      return;
    }

    try {
      const eventSource = new EventSource('/api/metrics/stream');

      eventSource.onmessage = (event) => {
        try {
          const metrics = JSON.parse(event.data);
          // Transform flat metrics to match Redux state structure
          const transformedMetrics = {
            cpu: metrics.cpu || 0,
            memory: {
              percent: metrics.memory || 0,
              used: 0,
              total: 0
            },
            disk: {
              percent: metrics.disk || 0,
              used: 0,
              total: 0
            },
            load: {
              avg1: metrics.load || 0,
              avg5: 0,
              avg15: 0
            },
            uptime: metrics.uptime || 0
          };
          dispatch(updateMetrics(transformedMetrics));
        } catch (error) {
          console.error('[MetricsSSE] Failed to parse metrics:', error);
        }
      };

      eventSource.onerror = () => {
        console.error('[MetricsSSE] Connection error');
        closeSSE();

        // Reconnect with exponential backoff
        reconnectAttemptsRef.current += 1;
        const delay = getReconnectDelay();
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, delay);
      };

      eventSource.onopen = () => {
        console.log('[MetricsSSE] Connected');
        reconnectAttemptsRef.current = 0;
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('[MetricsSSE] Failed to create EventSource:', error);
    }
  };

  useEffect(() => {
    connectSSE();

    return () => {
      closeSSE();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Return nothing - this hook just manages the connection
  return null;
}
