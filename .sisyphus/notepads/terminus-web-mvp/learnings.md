
## Task 7 - Terminal UI Component
- Installed xterm.js packages: `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-clipboard`
- Created `TerminalClient` component with xterm configuration and Fit/Clipboard addons
- Implemented `TerminalContainer` for layout wrapper
- Updated `/terminal` page to use the new terminal components
- Confirmed xterm requires client-side rendering (use client)
- Verified build success with Next.js 15
- FitAddon properly resizes terminal on window resize (debounced)
- Dark theme configuration matches requirements

## Task 8 - WebSocket Integration

- Installed `@xterm/addon-attach` for bidirectional terminal/WebSocket communication
- Created `hooks/useTerminalConnection.ts` with the following patterns:
  - CRITICAL: Set `socket.binaryType = 'arraybuffer'` immediately after WebSocket creation for proper binary handling
  - AttachAddon is loaded AFTER socket.onopen event (not before)
  - AttachAddon initialized with `{ bidirectional: true }` option
  - Initial resize sent as JSON: `{type:'resize', cols, rows}` after AttachAddon loads
  - Exit messages handled as JSON strings while binary data (input/output) handled by AttachAddon
  - Resize events from `terminal.onResize()` sent to socket when ready
- Updated `TerminalClient.tsx`:
  - Called `useTerminalConnection(terminalInstance.current)` to get connect function
  - Used second useEffect to call `connect()` after terminal initialization
  - This ensures terminal ref is populated before connection attempt
- Redux integration: setConnectionStatus('connecting'|'connected'|'disconnected'), setError, setExitCode, resetReconnectAttempts
- Build successful with no LSP diagnostics errors
- Key insight: The hook properly manages socket lifecycle and terminal addon loading order

## Task 9: Reconnection Logic and UI Overlay
- Implemented exponential backoff with formula: `Math.min(1000 * Math.pow(2, attempts), 16000)`
- Added `reconnectAttempts` to Redux state to track retries across components
- Created `DisconnectedOverlay` that calculates its own countdown based on the same backoff formula
- Created `SessionEndedOverlay` that only appears on explicit exit codes (differentiating form network drops)
- Updated `useTerminalConnection` hook:
  - Added `isManuallyClosedRef` to distinguish between intentional disconnects (no retry) and errors (retry)
  - Used `setTimeout` for backoff delays
  - Stops auto-retry after 5 attempts
- Integrated overlays into `TerminalClient` with z-index positioning over the terminal canvas

## Task 10: UI Polish and Connection Status
- Added `ConnectionStatus` component with colored indicators for real-time feedback (green=connected, yellow=connecting, red=disconnected).
- Created `TerminalHeader` to house the title and status indicator, establishing a clear app structure.
- Implemented full-height flex layout: Header (fixed) -> Terminal (flex-1) -> Footer Hints (fixed).
- Migrated all overlay buttons to shadcn/ui `Button` component for consistent styling.
- Added visual loading spinner (CSS animation) for 'connecting' state.
- Learnings: 
  - `shrink-0` is vital for headers/footers in flex-col layouts to prevent squishing by xterm canvas.
  - `w-screen h-screen` on the root container is more reliable than `100vh` for full-screen web apps to avoid scrollbar jitter.

## Task 11: PM2 Configuration and Development Scripts
- Created `ecosystem.config.js` for PM2 process management with two apps:
  - `terminus-web`: Runs Next.js frontend on port 3000 with `NEXT_PUBLIC_WS_URL=ws://localhost:3001`
  - `terminus-pty`: Runs WebSocket PTY server on port 3001 with `OPENCODE_PATH=/usr/local/bin/opencode`
- Created `scripts/dev.sh` for concurrent development mode:
  - Starts both services in background with process tracking
  - Implements trap handler for graceful Ctrl+C cleanup (kills both PIDs)
  - Pattern: `(cd apps/pty-server && npm run dev) &` + store PID + trap cleanup
- Created `scripts/install-opencode.sh` for Ubuntu 24.04:
  - Installs `build-essential` and `python3` (required for node-pty native compilation)
  - Uses official OpenCode install script: `curl -fsSL https://opencode.ai/install | bash`
  - Verifies installation with `opencode --version`
- Updated root `package.json` with process management scripts:
  - `npm run dev` → runs `./scripts/dev.sh` (concurrent development)
  - `npm run start` → `pm2 start ecosystem.config.js` (production)
  - `npm run pm2:start|stop|restart|logs` → PM2 control commands
- **Critical pattern**: Root package.json orchestrates monorepo, individual workspace package.jsons handle their own dev/build/start
- **TLS note**: PM2 config documents that production WSS requires nginx/Caddy reverse proxy with TLS termination (not implemented in Node.js directly)
- Verification: All shell scripts validated with `bash -n`, ecosystem.config.js parses cleanly, scripts are executable (chmod +x)
- **Lesson**: PM2 ecosystem config is deployment infrastructure, not application code - operational comments are necessary for DevOps setup
