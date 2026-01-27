
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
