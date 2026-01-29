'use client';

import { useEffect, useRef, useState } from 'react';
import type { Terminal as TerminalType, FitAddon as FitAddonType } from 'ghostty-web';
import { useTerminalConnection } from '@/hooks/useTerminalConnection';
import { DisconnectedOverlay } from './DisconnectedOverlay';
import { SessionEndedOverlay } from './SessionEndedOverlay';
import { useAppDispatch } from '@/lib/store/hooks';
import {
  resetReconnectAttempts,
  setConnectionStatus,
  setExitCode,
} from '@/lib/store/terminalSlice';

interface TerminalClientProps {
  tabId: string; // Tab ID (also used as DB session ID)
  existingPtyId?: string; // PTY ID if reconnecting to existing session
  isActive?: boolean;
}

export function TerminalClient({ tabId, existingPtyId, isActive = true }: TerminalClientProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<FitAddonType | null>(null);
  const terminalInstanceRef = useRef<TerminalType | null>(null);
  const [terminal, setTerminal] = useState<TerminalType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { connect } = useTerminalConnection(terminal, { tabId, existingPtyId });
  const connectRef = useRef(connect);
  const dispatch = useAppDispatch();

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!terminalRef.current || terminalInstanceRef.current) return;

    const container = terminalRef.current;

    async function initGhostty() {
      try {
        const ghostty = await import('ghostty-web');
        await ghostty.init();

        const term = new ghostty.Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          scrollback: 10000,
          theme: {
            background: '#1a1a1a',
            foreground: '#e0e0e0',
            cursor: '#ffffff',
          },
        });

        term.attachCustomWheelEventHandler((event) => {
          if (!term.hasMouseTracking()) {
            return false;
          }

          const rect = term.element?.getBoundingClientRect();
          if (!rect || rect.width === 0 || rect.height === 0) {
            return false;
          }

          const cols = term.cols || 1;
          const rows = term.rows || 1;
          const col = Math.min(
            cols,
            Math.max(1, Math.ceil(((event.clientX - rect.left) / rect.width) * cols))
          );
          const row = Math.min(
            rows,
            Math.max(1, Math.ceil(((event.clientY - rect.top) / rect.height) * rows))
          );

          let steps = 0;
          if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
            steps = Math.round(event.deltaY / 33);
          } else if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            steps = Math.round(event.deltaY);
          } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            steps = Math.round(event.deltaY * rows);
          }

          if (steps === 0) {
            return true;
          }

          const baseCode = steps < 0 ? 64 : 65;
          const modifier =
            (event.shiftKey ? 4 : 0) + (event.altKey ? 8 : 0) + (event.ctrlKey ? 16 : 0);
          const code = baseCode + modifier;
          const count = Math.min(Math.abs(steps), 5);

          for (let i = 0; i < count; i += 1) {
            term.input(`\x1b[<${code};${col};${row}M`, true);
          }

          return true;
        });

        const fitAddon = new ghostty.FitAddon();
        fitAddonRef.current = fitAddon;
        terminalInstanceRef.current = term;
        term.loadAddon(fitAddon);

        term.open(container);
        fitAddon.fit();

        setTerminal(term);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to init terminal:', err);
        setIsLoading(false);
      }
    }

    initGhostty();

    let resizeTimeout: NodeJS.Timeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      terminalInstanceRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (terminal) {
      connectRef.current();
    }
  }, [terminal]);

  useEffect(() => {
    if (terminal && isActive) {
      terminal.focus();
    }
  }, [terminal, isActive]);

  const handleReconnect = () => {
    dispatch(resetReconnectAttempts());
    dispatch(setConnectionStatus('connecting'));
    connect();
  };

  const handleNewSession = () => {
    dispatch(setExitCode(null));
    dispatch(setConnectionStatus('connecting'));
    connect();
  };

  return (
    <div className="relative w-full h-full bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          Loading terminal...
        </div>
      )}
      <div ref={terminalRef} className="w-full h-full" />
      <DisconnectedOverlay onReconnect={handleReconnect} />
      <SessionEndedOverlay onNewSession={handleNewSession} />
    </div>
  );
}
