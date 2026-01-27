'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import '@xterm/xterm/css/xterm.css';

export function TerminalClient() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current || terminalInstance.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      scrollback: 100,
      theme: {
        background: '#1a1a1a',
        foreground: '#e0e0e0',
        cursor: '#ffffff',
      },
    });

    fitAddon.current = new FitAddon();
    terminal.loadAddon(fitAddon.current);
    terminal.loadAddon(new ClipboardAddon());
    
    terminal.open(terminalRef.current);
    fitAddon.current.fit();

    terminalInstance.current = terminal;

    // Debounced resize
    let resizeTimeout: NodeJS.Timeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        fitAddon.current?.fit();
      }, 100);
    });
    observer.observe(terminalRef.current);

    return () => {
      observer.disconnect();
      terminal.dispose();
    };
  }, []);

  return <div ref={terminalRef} className="w-full h-full" />;
}
