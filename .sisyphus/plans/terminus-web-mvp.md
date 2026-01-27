# Terminus-Web MVP: Web-Based Terminal Emulator

## Context

### Original Request
Build a web-based terminal emulator that provides a real interactive shell experience in the browser, specifically designed to run OpenCode (CLI/TUI) with full interactivity. The frontend must use a specific tech stack (Next.js 16+, React 19+, Redux Toolkit, Tailwind CSS, shadcn/ui). Create a GitHub repo and commit incrementally.

### Interview Summary
**Key Discussions**:
- **Architecture**: Separate WebSocket PTY server (port 3001) + Next.js frontend (port 3000)
- **Backend choice**: Node.js/TypeScript with ws + node-pty (not custom Next.js server)
- **Terminal library**: xterm.js with FitAddon, AttachAddon, ClipboardAddon
- **Protocol**: Binary for PTY data, JSON for control messages

**Research Findings**:
- Always use `socket.binaryType = 'arraybuffer'` for proper binary handling
- Use `xterm-256color` TERM variable for full color support
- Implement backpressure with pty.pause()/resume()
- Validate resize dimensions (min 1, max 500)
- Use ClipboardAddon for OSC 52 clipboard support

### Metis Review
**Identified Gaps** (addressed):
- **Target OS**: Ubuntu 24.04 LTS - need install script for OpenCode
- **Deployment**: PM2 on bare metal (no containers in MVP)
- **TLS**: WSS required - document nginx/Caddy TLS termination
- **Clipboard**: Full integration with @xterm/addon-clipboard
- **Grace period**: 5 seconds before PTY kill on disconnect
- **Exit handling**: Show "Session ended" message with exit code
- **Environment whitelist**: Only pass safe env vars to PTY

---

## Work Objectives

### Core Objective
Create a working web-based terminal that can run OpenCode TUI in the browser with full interactivity, proper resize handling, and clean session lifecycle management.

### Concrete Deliverables
1. GitHub repository `terminus-web` with monorepo structure
2. WebSocket PTY server (`apps/pty-server/`)
3. Next.js frontend (`apps/web/`)
4. OpenCode install script (`scripts/install-opencode.sh`)
5. PM2 configuration (`ecosystem.config.js`)
6. Documentation (README.md, ARCHITECTURE.md)

### Definition of Done
- [ ] `npm run dev` starts both frontend and PTY server
- [ ] Browser shows terminal that connects to WebSocket server
- [ ] Typing in terminal sends input to OpenCode process
- [ ] OpenCode TUI renders correctly with colors and cursor
- [ ] Resizing browser window resizes terminal
- [ ] Closing tab shows "Session ended" after 5-second grace period
- [ ] Disconnect shows reconnection overlay with auto-reconnect

### Must Have
- Real PTY (node-pty) with TERM=xterm-256color
- Bidirectional binary WebSocket communication
- JSON control messages for resize/exit/ping
- FitAddon for responsive terminal sizing
- ClipboardAddon for copy/paste support
- Heartbeat ping/pong (30 seconds)
- Connection state indicator in UI
- Graceful shutdown on SIGTERM/SIGINT

### Must NOT Have (Guardrails)
- Session persistence or reconnect-to-same-PTY
- Multiple terminal tabs
- File upload/download features
- WebGL renderer (stick to canvas)
- Authentication beyond stub middleware
- Rate limiting
- Arbitrary environment variables passed to PTY
- Resize dimensions > 500 or < 1
- i18n/localization
- Custom keybindings configuration
- Containerization

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (greenfield project)
- **User wants tests**: Manual verification (MVP focus)
- **Framework**: Jest + React Testing Library (basic setup only)

### Manual QA Approach
Each TODO includes detailed manual verification procedures:
- Browser automation via Playwright for UI verification
- Terminal commands for backend verification
- Visual inspection for TUI rendering

---

## Task Flow

```
Task 0 (Git Setup)
       ↓
Task 1 (Monorepo Structure)
       ↓
Task 2 (PTY Server Basic) ─────────────┐
       ↓                               │
Task 3 (PTY Server Protocol)           │
       ↓                               │
Task 4 (PTY Server Lifecycle)          │
       ↓                               ↓
Task 5 (Next.js Skeleton) ←── (parallel after Task 1)
       ↓
Task 6 (Redux Store)
       ↓
Task 7 (Terminal Component)
       ↓
Task 8 (WebSocket Integration)
       ↓
Task 9 (Reconnection Logic)
       ↓
Task 10 (UI Polish)
       ↓
Task 11 (PM2 + Scripts)
       ↓
Task 12 (Documentation)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2-4, 5 | Backend and frontend skeleton can develop in parallel after Task 1 |

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | 0 | Needs git repo to exist |
| 2-12 | 1 | Need monorepo structure |
| 6 | 5 | Needs Next.js project |
| 7 | 6 | Needs Redux store |
| 8 | 4, 7 | Needs both PTY server and terminal component |
| 9 | 8 | Needs working connection first |
| 10 | 9 | Needs reconnection logic |
| 11 | 10 | Needs complete application |
| 12 | 11 | Document final state |

---

## TODOs

- [x] 0. Initialize Git Repository and GitHub Remote

  **What to do**:
  - Create initial commit with .gitignore
  - Create GitHub repository via `gh repo create terminus-web --public`
  - Push initial commit

  **Must NOT do**:
  - Add any code files yet
  - Create complex branch structure

  **Parallelizable**: NO (first task)

  **References**:
  - GitHub CLI docs: https://cli.github.com/manual/gh_repo_create

  **Acceptance Criteria**:
  - [ ] `git log` shows initial commit
  - [ ] `gh repo view` shows public repo on github.com
  - [ ] GitHub URL: `https://github.com/itsmylife44/terminus-web`

  **Commit**: YES
  - Message: `chore: initial commit with .gitignore`
  - Files: `.gitignore`

---

- [ ] 1. Create Monorepo Structure with Turborepo

  **What to do**:
  - Initialize npm workspace in root
  - Create `apps/web/` for Next.js
  - Create `apps/pty-server/` for WebSocket server
  - Create `packages/shared/` for shared types
  - Add Turborepo configuration
  - Add root ESLint and Prettier configs
  - Add TypeScript base config

  **Must NOT do**:
  - Install Next.js yet (that's Task 5)
  - Add any application code

  **Parallelizable**: NO (depends on 0)

  **References**:
  - Turborepo getting started: https://turbo.build/repo/docs/getting-started/create-new

  **File Structure**:
  ```
  terminus-web/
  ├── apps/
  │   ├── web/
  │   │   └── package.json
  │   └── pty-server/
  │       └── package.json
  ├── packages/
  │   └── shared/
  │       ├── src/
  │       │   └── types.ts
  │       └── package.json
  ├── package.json (workspace root)
  ├── turbo.json
  ├── tsconfig.base.json
  ├── .eslintrc.js
  └── .prettierrc
  ```

  **Acceptance Criteria**:
  - [ ] `npm install` from root installs all workspaces
  - [ ] `npm run lint` from root runs ESLint
  - [ ] `packages/shared` can be imported by other packages

  **Commit**: YES
  - Message: `chore: setup monorepo with turborepo`
  - Files: `package.json`, `turbo.json`, `apps/*/package.json`, `packages/*/`

---

- [x] 2. Create WebSocket PTY Server - Basic Structure

  **What to do**:
  - Set up TypeScript configuration in `apps/pty-server/`
  - Install dependencies: `ws`, `node-pty`, `typescript`, `tsx`
  - Create basic WebSocket server that accepts connections
  - Create PTY spawn function (without protocol handling yet)
  - Add environment variable whitelist: TERM, COLORTERM, LANG, PATH, HOME, USER

  **Must NOT do**:
  - Add protocol handling (that's Task 3)
  - Add lifecycle management (that's Task 4)
  - Spawn OpenCode yet (just test with shell)

  **Parallelizable**: YES (with Task 5, after Task 1)

  **References**:
  - node-pty docs: https://github.com/microsoft/node-pty
  - ws docs: https://github.com/websockets/ws

  **Key Code Patterns**:
  ```typescript
  // PTY spawn with environment whitelist
  const ALLOWED_ENV_VARS = ['TERM', 'COLORTERM', 'LANG', 'PATH', 'HOME', 'USER'];
  const safeEnv = Object.fromEntries(
    ALLOWED_ENV_VARS.filter(k => process.env[k]).map(k => [k, process.env[k]])
  );
  safeEnv.TERM = 'xterm-256color';
  
  const pty = nodePty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME,
    env: safeEnv
  });
  ```

  **Acceptance Criteria**:
  - [ ] `npm run dev` in `apps/pty-server` starts WebSocket server on port 3001
  - [ ] WebSocket client can connect: `wscat -c ws://localhost:3001`
  - [ ] Server logs "Client connected" on connection
  - [ ] PTY spawns shell process successfully

  **Manual Verification**:
  - [ ] Run: `cd apps/pty-server && npm run dev`
  - [ ] Run: `wscat -c ws://localhost:3001`
  - [ ] Expected: Server prints connection log, client receives shell output

  **Commit**: YES
  - Message: `feat(pty-server): basic websocket server with pty spawn`
  - Files: `apps/pty-server/src/*.ts`, `apps/pty-server/package.json`

---

- [ ] 3. WebSocket PTY Server - Protocol Implementation

  **What to do**:
  - Implement message protocol: binary for PTY data, JSON for control
  - Handle `resize` message: `{"type":"resize","cols":80,"rows":24}`
  - Handle `ping` message: respond with `{"type":"pong"}`
  - Implement backpressure: pause PTY when WebSocket buffer full
  - Validate resize dimensions: min 1, max 500, must be integers
  - Send exit message: `{"type":"exit","code":0}`

  **Must NOT do**:
  - Add heartbeat timer (that's Task 4)
  - Add grace period logic (that's Task 4)

  **Parallelizable**: NO (depends on 2)

  **References**:
  - ws send callback for backpressure: https://github.com/websockets/ws#sending-binary-data

  **Protocol Specification**:
  | Direction | Type | Format |
  |-----------|------|--------|
  | Client→Server | Input | Raw string |
  | Client→Server | Resize | `{"type":"resize","cols":N,"rows":N}` |
  | Client→Server | Ping | `{"type":"ping"}` |
  | Server→Client | Output | Raw binary/string |
  | Server→Client | Exit | `{"type":"exit","code":N}` |
  | Server→Client | Error | `{"type":"error","message":"..."}` |
  | Server→Client | Pong | `{"type":"pong"}` |

  **Key Code Patterns**:
  ```typescript
  // Message handling with validation
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'resize') {
        const cols = Math.max(1, Math.min(500, Math.floor(msg.cols)));
        const rows = Math.max(1, Math.min(500, Math.floor(msg.rows)));
        pty.resize(cols, rows);
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      // Not JSON, treat as input
      pty.write(data.toString());
    }
  });

  // Backpressure implementation
  pty.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      pty.pause();
      ws.send(data, () => pty.resume());
    }
  });
  ```

  **Acceptance Criteria**:
  - [ ] Resize message changes PTY dimensions
  - [ ] Invalid resize (>500, <1, non-integer) is clamped safely
  - [ ] Ping message returns pong
  - [ ] PTY output flows to WebSocket
  - [ ] WebSocket input flows to PTY

  **Manual Verification**:
  - [ ] Run: `wscat -c ws://localhost:3001`
  - [ ] Type: `{"type":"resize","cols":120,"rows":40}` → no crash
  - [ ] Type: `{"type":"ping"}` → receive `{"type":"pong"}`
  - [ ] Type: `ls` → receive directory listing

  **Commit**: YES
  - Message: `feat(pty-server): implement websocket protocol with resize and backpressure`
  - Files: `apps/pty-server/src/*.ts`

---

- [x] 4. WebSocket PTY Server - Lifecycle Management

  **What to do**:
  - Add 30-second heartbeat timer with ping/pong
  - Add 5-second grace period before killing PTY on disconnect
  - Handle PTY exit: send exit message, close WebSocket
  - Handle SIGTERM/SIGINT for graceful shutdown
  - Clean up orphaned PTY processes on startup
  - Add proper error handling for ESRCH (process already exited)
  - Spawn OpenCode instead of shell (configurable via env var)

  **Must NOT do**:
  - Session persistence
  - Multiple sessions per connection

  **Parallelizable**: NO (depends on 3)

  **References**:
  - OpenCode binary: `/Users/xspam/.opencode/bin/opencode` (local dev)
  - Production: Will be installed via script

  **Key Code Patterns**:
  ```typescript
  // Heartbeat
  const HEARTBEAT_INTERVAL = 30000;
  let isAlive = true;
  
  const heartbeat = setInterval(() => {
    if (!isAlive) {
      ws.terminate();
      return;
    }
    isAlive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);
  
  ws.on('pong', () => { isAlive = true; });

  // Grace period on disconnect
  let gracePeriodTimer: NodeJS.Timeout | null = null;
  
  ws.on('close', () => {
    clearInterval(heartbeat);
    gracePeriodTimer = setTimeout(() => {
      try {
        pty.kill();
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e;
      }
    }, 5000);
  });

  // PTY exit
  pty.onExit(({ exitCode, signal }) => {
    if (gracePeriodTimer) clearTimeout(gracePeriodTimer);
    ws.send(JSON.stringify({ type: 'exit', code: exitCode, signal }));
    ws.close();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    wss.clients.forEach(ws => ws.close());
    wss.close(() => process.exit(0));
  });
  ```

  **Acceptance Criteria**:
  - [ ] Server pings every 30 seconds
  - [ ] No pong within 30s terminates connection
  - [ ] Closing browser waits 5s before killing PTY
  - [ ] PTY exit sends exit code to client
  - [ ] `kill -TERM <pid>` gracefully closes all connections
  - [ ] OpenCode starts when OPENCODE_PATH env var is set

  **Manual Verification**:
  - [ ] Run: `OPENCODE_PATH=/Users/xspam/.opencode/bin/opencode npm run dev`
  - [ ] Connect: `wscat -c ws://localhost:3001`
  - [ ] Expected: OpenCode TUI output appears
  - [ ] Disconnect wscat, wait 5s, check PTY process is killed
  - [ ] Send SIGTERM to server, verify graceful shutdown

  **Commit**: YES
  - Message: `feat(pty-server): add lifecycle management with heartbeat and grace period`
  - Files: `apps/pty-server/src/*.ts`

---

- [x] 5. Create Next.js Frontend Skeleton

  **What to do**:
  - Initialize Next.js 15+ with App Router in `apps/web/`
  - Configure TypeScript strict mode
  - Install and configure Tailwind CSS
  - Install shadcn/ui and Radix UI
  - Create basic layout with dark theme
  - Create `/terminal` route (empty page for now)
  - Add DOMPurify for future sanitization needs

  **Must NOT do**:
  - Add terminal component yet (Task 7)
  - Add Redux yet (Task 6)
  - Add any WebSocket code

  **Parallelizable**: YES (with Tasks 2-4, after Task 1)

  **References**:
  - Next.js App Router: https://nextjs.org/docs/app
  - shadcn/ui: https://ui.shadcn.com/docs/installation/next
  - Tailwind CSS: https://tailwindcss.com/docs/guides/nextjs

  **File Structure**:
  ```
  apps/web/
  ├── app/
  │   ├── layout.tsx
  │   ├── page.tsx
  │   ├── globals.css
  │   └── terminal/
  │       └── page.tsx
  ├── components/
  │   └── ui/
  │       └── (shadcn components)
  ├── lib/
  │   └── utils.ts
  ├── tailwind.config.ts
  ├── tsconfig.json
  └── package.json
  ```

  **Acceptance Criteria**:
  - [ ] `npm run dev` starts Next.js on port 3000
  - [ ] `/` shows landing page
  - [ ] `/terminal` shows empty terminal page
  - [ ] Dark theme is applied
  - [ ] No TypeScript errors in strict mode

  **Manual Verification**:
  - [ ] Navigate to `http://localhost:3000` → see landing page
  - [ ] Navigate to `http://localhost:3000/terminal` → see terminal page
  - [ ] Page uses dark theme colors

  **Commit**: YES
  - Message: `feat(web): setup next.js with tailwind and shadcn`
  - Files: `apps/web/*`

---

- [ ] 6. Setup Redux Store for Terminal State

  **What to do**:
  - Install Redux Toolkit and react-redux
  - Create store configuration
  - Create terminalSlice with state:
    - `connectionStatus`: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
    - `lastError`: string | null
    - `exitCode`: number | null
    - `reconnectAttempts`: number
  - Create Redux Provider wrapper
  - Add typed hooks (useAppDispatch, useAppSelector)

  **Must NOT do**:
  - Store terminal content in Redux (xterm.js manages that)
  - Add WebSocket logic to Redux (keep it in component)

  **Parallelizable**: NO (depends on 5)

  **References**:
  - Redux Toolkit with Next.js: https://redux-toolkit.js.org/tutorials/quick-start

  **Key Code Patterns**:
  ```typescript
  // terminalSlice.ts
  interface TerminalState {
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
    lastError: string | null;
    exitCode: number | null;
    reconnectAttempts: number;
  }

  const initialState: TerminalState = {
    connectionStatus: 'disconnected',
    lastError: null,
    exitCode: null,
    reconnectAttempts: 0,
  };

  export const terminalSlice = createSlice({
    name: 'terminal',
    initialState,
    reducers: {
      setConnectionStatus: (state, action: PayloadAction<TerminalState['connectionStatus']>) => {
        state.connectionStatus = action.payload;
      },
      setError: (state, action: PayloadAction<string | null>) => {
        state.lastError = action.payload;
      },
      setExitCode: (state, action: PayloadAction<number | null>) => {
        state.exitCode = action.payload;
      },
      incrementReconnectAttempts: (state) => {
        state.reconnectAttempts += 1;
      },
      resetReconnectAttempts: (state) => {
        state.reconnectAttempts = 0;
      },
    },
  });
  ```

  **Acceptance Criteria**:
  - [ ] Redux DevTools shows terminal slice
  - [ ] State updates reflect in DevTools
  - [ ] Typed hooks work without type errors

  **Manual Verification**:
  - [ ] Open Redux DevTools in browser
  - [ ] Verify `terminal` slice exists with initial state

  **Commit**: YES
  - Message: `feat(web): add redux toolkit with terminal slice`
  - Files: `apps/web/lib/store/*`

---

- [ ] 7. Create Terminal UI Component

  **What to do**:
  - Install xterm.js packages: `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-clipboard`
  - Create TerminalContainer component (layout wrapper)
  - Create TerminalClient component (client-only, handles xterm)
  - Configure xterm with:
    - `cursorBlink: true`
    - `fontSize: 14`
    - `fontFamily: 'Menlo, Monaco, "Courier New", monospace'`
    - `scrollback: 100`
    - Dark theme colors
  - Load FitAddon and ClipboardAddon
  - Handle terminal resize with ResizeObserver
  - Debounce resize events (100ms)

  **Must NOT do**:
  - Connect to WebSocket yet (Task 8)
  - Add AttachAddon yet (Task 8)
  - Store terminal state in Redux

  **Parallelizable**: NO (depends on 6)

  **References**:
  - xterm.js: https://xtermjs.org/docs/
  - FitAddon: https://github.com/xtermjs/xterm.js/tree/master/addons/addon-fit
  - ClipboardAddon: https://github.com/xtermjs/xterm.js/tree/master/addons/addon-clipboard

  **Key Code Patterns**:
  ```typescript
  // TerminalClient.tsx (client component)
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
  ```

  **Acceptance Criteria**:
  - [ ] Terminal renders in `/terminal` page
  - [ ] Terminal fills container
  - [ ] Resizing window resizes terminal (debounced)
  - [ ] Terminal has dark theme
  - [ ] Clipboard addon loaded (Ctrl+Shift+C/V works)

  **Manual Verification**:
  - [ ] Navigate to `/terminal`
  - [ ] Terminal canvas renders with cursor blinking
  - [ ] Resize window → terminal resizes after 100ms
  - [ ] Type text → appears in terminal (local echo)

  **Commit**: YES
  - Message: `feat(web): add xterm.js terminal component with fit and clipboard addons`
  - Files: `apps/web/components/terminal/*`

---

- [x] 8. WebSocket Integration

  **What to do**:
  - Install `@xterm/addon-attach`
  - Create useTerminalConnection hook
  - Connect to WebSocket server on component mount
  - Configure `socket.binaryType = 'arraybuffer'`
  - Load AttachAddon after connection opens
  - Send initial resize on connection
  - Send resize events when terminal dimensions change
  - Update Redux state on connection events
  - Handle exit message: update state, show message

  **Must NOT do**:
  - Add reconnection logic yet (Task 9)
  - Add auth token handling

  **Parallelizable**: NO (depends on 4 and 7)

  **References**:
  - AttachAddon: https://github.com/xtermjs/xterm.js/tree/master/addons/addon-attach

  **Key Code Patterns**:
  ```typescript
  // useTerminalConnection.ts
  export function useTerminalConnection(terminal: Terminal | null) {
    const dispatch = useAppDispatch();
    const socketRef = useRef<WebSocket | null>(null);

    const connect = useCallback(() => {
      if (!terminal) return;
      
      dispatch(setConnectionStatus('connecting'));
      
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      const socket = new WebSocket(wsUrl);
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;

      socket.onopen = () => {
        dispatch(setConnectionStatus('connected'));
        dispatch(resetReconnectAttempts());
        
        const attachAddon = new AttachAddon(socket, { bidirectional: true });
        terminal.loadAddon(attachAddon);
        
        // Send initial size
        socket.send(JSON.stringify({
          type: 'resize',
          cols: terminal.cols,
          rows: terminal.rows
        }));
        
        terminal.focus();
      };

      socket.onmessage = (event) => {
        // Check for JSON control messages
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'exit') {
              dispatch(setExitCode(msg.code));
              terminal.writeln(`\r\n\x1b[33mSession ended (exit code: ${msg.code})\x1b[0m`);
            }
          } catch { /* Binary data, handled by AttachAddon */ }
        }
      };

      socket.onerror = () => {
        dispatch(setError('Connection error'));
      };

      socket.onclose = () => {
        dispatch(setConnectionStatus('disconnected'));
      };
    }, [terminal, dispatch]);

    // Send resize events
    useEffect(() => {
      if (!terminal) return;
      
      const disposable = terminal.onResize(({ cols, rows }) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });
      
      return () => disposable.dispose();
    }, [terminal]);

    return { connect, socket: socketRef };
  }
  ```

  **Acceptance Criteria**:
  - [ ] Terminal connects to WebSocket server
  - [ ] Typing sends input to PTY
  - [ ] PTY output appears in terminal
  - [ ] OpenCode TUI renders correctly
  - [ ] Resize events sent to server
  - [ ] Exit code shown when process ends
  - [ ] Redux state reflects connection status

  **Manual Verification**:
  - [ ] Start PTY server: `OPENCODE_PATH=/Users/xspam/.opencode/bin/opencode npm run dev`
  - [ ] Open `http://localhost:3000/terminal`
  - [ ] Expected: OpenCode TUI loads and is interactive
  - [ ] Resize browser → terminal resizes, TUI adapts
  - [ ] Exit OpenCode (Ctrl+C) → "Session ended" message appears

  **Commit**: YES
  - Message: `feat(web): integrate websocket with xterm.js using attach addon`
  - Files: `apps/web/components/terminal/*`, `apps/web/hooks/*`

---

- [x] 9. Reconnection Logic and UI Overlay

  **What to do**:
  - Add reconnection with exponential backoff (1s, 2s, 4s, 8s, 16s max)
  - Create DisconnectedOverlay component with:
    - "Disconnected" message
    - Reconnect attempt counter
    - "Reconnecting in Xs..." countdown
    - Manual "Reconnect Now" button
  - Create SessionEndedOverlay component with:
    - Exit code display
    - "Start New Session" button
  - Reset terminal on reconnection (clear screen, reset state)
  - Max 5 reconnect attempts before giving up

  **Must NOT do**:
  - Reconnect to same PTY session (new session each time)

  **Parallelizable**: NO (depends on 8)

  **References**:
  - Exponential backoff pattern from research

  **Key Code Patterns**:
  ```typescript
  // Exponential backoff
  const getBackoffDelay = (attempts: number) => {
    return Math.min(1000 * Math.pow(2, attempts), 16000);
  };

  // DisconnectedOverlay.tsx
  export function DisconnectedOverlay({ onReconnect }: { onReconnect: () => void }) {
    const { connectionStatus, reconnectAttempts } = useAppSelector(state => state.terminal);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
      if (connectionStatus !== 'reconnecting') return;
      
      const delay = getBackoffDelay(reconnectAttempts);
      setCountdown(Math.ceil(delay / 1000));
      
      const interval = setInterval(() => {
        setCountdown(c => Math.max(0, c - 1));
      }, 1000);
      
      const timeout = setTimeout(onReconnect, delay);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }, [connectionStatus, reconnectAttempts, onReconnect]);

    if (connectionStatus === 'connected') return null;

    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl mb-4">Disconnected</h2>
          {reconnectAttempts < 5 ? (
            <>
              <p>Reconnecting in {countdown}s...</p>
              <p className="text-sm text-gray-400">Attempt {reconnectAttempts + 1}/5</p>
              <button onClick={onReconnect} className="mt-4 px-4 py-2 bg-blue-600 rounded">
                Reconnect Now
              </button>
            </>
          ) : (
            <>
              <p>Connection failed after 5 attempts</p>
              <button onClick={onReconnect} className="mt-4 px-4 py-2 bg-blue-600 rounded">
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
  ```

  **Acceptance Criteria**:
  - [ ] Disconnect shows overlay with countdown
  - [ ] Auto-reconnect after countdown
  - [ ] Backoff doubles each attempt (1s, 2s, 4s, 8s, 16s)
  - [ ] "Reconnect Now" button works
  - [ ] Stops after 5 failed attempts
  - [ ] Session ended shows exit code and "Start New Session"
  - [ ] New session clears terminal

  **Manual Verification**:
  - [ ] Kill PTY server while connected → overlay appears
  - [ ] Watch countdown → auto-reconnect attempts
  - [ ] Click "Reconnect Now" → immediate reconnect
  - [ ] After 5 failures → shows "Try Again" button
  - [ ] Exit OpenCode → shows "Session ended" overlay

  **Commit**: YES
  - Message: `feat(web): add reconnection logic with exponential backoff and overlays`
  - Files: `apps/web/components/terminal/*`, `apps/web/hooks/*`

---

- [x] 10. UI Polish and Connection Status Indicator

  **What to do**:
  - Add connection status indicator (colored dot + text)
  - Add shadcn Button for "Start New Session"
  - Style overlays with Tailwind and shadcn components
  - Add loading spinner during connection
  - Add keyboard shortcut hints (Ctrl+Shift+C/V for clipboard)
  - Ensure terminal takes full viewport height minus header
  - Add simple header with title and status

  **Must NOT do**:
  - Add complex navigation
  - Add settings panel
  - Add multiple tabs

  **Parallelizable**: NO (depends on 9)

  **References**:
  - shadcn/ui Button: https://ui.shadcn.com/docs/components/button

  **Acceptance Criteria**:
  - [ ] Status indicator shows: green=connected, yellow=connecting, red=disconnected
  - [ ] Header shows "Terminus" title
  - [ ] Terminal fills viewport below header
  - [ ] Overlays styled consistently with shadcn
  - [ ] Loading spinner during initial connection

  **Manual Verification**:
  - [ ] Page load → yellow "Connecting..." indicator
  - [ ] Connected → green "Connected" indicator
  - [ ] Disconnect → red "Disconnected" + overlay
  - [ ] UI looks polished and consistent

  **Commit**: YES
  - Message: `feat(web): add connection status indicator and polish ui`
  - Files: `apps/web/components/*`, `apps/web/app/terminal/*`

---

- [x] 11. PM2 Configuration and Development Scripts

  **What to do**:
  - Create `ecosystem.config.js` for PM2
  - Create `scripts/install-opencode.sh` for Ubuntu 24.04
  - Create `scripts/dev.sh` to start both services
  - Add npm scripts: `dev`, `build`, `start`, `pm2:start`, `pm2:stop`
  - Configure environment variables:
    - `OPENCODE_PATH`: Path to OpenCode binary
    - `WS_PORT`: WebSocket server port (default 3001)
    - `NEXT_PUBLIC_WS_URL`: WebSocket URL for frontend
  - Document TLS termination options (nginx/Caddy)

  **Must NOT do**:
  - Implement TLS directly
  - Add Docker/containerization

  **Parallelizable**: NO (depends on 10)

  **References**:
  - PM2 ecosystem: https://pm2.keymetrics.io/docs/usage/application-declaration/
  - OpenCode install: https://opencode.ai

  **Key Files**:
  ```javascript
  // ecosystem.config.js
  module.exports = {
    apps: [
      {
        name: 'terminus-web',
        cwd: './apps/web',
        script: 'npm',
        args: 'start',
        env: {
          PORT: 3000,
          NEXT_PUBLIC_WS_URL: 'ws://localhost:3001'
        }
      },
      {
        name: 'terminus-pty',
        cwd: './apps/pty-server',
        script: 'npm',
        args: 'start',
        env: {
          WS_PORT: 3001,
          OPENCODE_PATH: '/usr/local/bin/opencode'
        }
      }
    ]
  };
  ```

  ```bash
  # scripts/install-opencode.sh
  #!/bin/bash
  set -e
  
  # Install dependencies for node-pty
  sudo apt-get update
  sudo apt-get install -y build-essential python3
  
  # Install OpenCode
  curl -fsSL https://opencode.ai/install | bash
  
  # Verify installation
  opencode --version
  ```

  **Acceptance Criteria**:
  - [ ] `npm run dev` starts both services concurrently
  - [ ] `npm run build` builds both apps
  - [ ] `pm2 start ecosystem.config.js` works
  - [ ] Install script works on fresh Ubuntu 24.04
  - [ ] Environment variables documented

  **Manual Verification**:
  - [ ] Run: `npm run dev` → both services start
  - [ ] Run: `npm run build && npm run start` → production mode works
  - [ ] (On Ubuntu) Run: `./scripts/install-opencode.sh` → OpenCode installs

  **Commit**: YES
  - Message: `feat: add pm2 config and development scripts`
  - Files: `ecosystem.config.js`, `scripts/*`, `package.json`

---

- [ ] 12. Documentation: README and ARCHITECTURE

  **What to do**:
  - Create comprehensive README.md with:
    - Project description
    - Quick start guide
    - Development setup
    - Production deployment
    - Environment variables reference
    - TLS/WSS configuration guide
  - Create ARCHITECTURE.md with:
    - System overview diagram
    - Component descriptions
    - Data flow diagrams
    - Protocol specification
    - Security considerations (for future)
  - Add inline code comments
  - Add CONTRIBUTING.md with development guidelines

  **Must NOT do**:
  - Over-document MVP features
  - Write API documentation (no REST API)

  **Parallelizable**: NO (depends on 11)

  **References**:
  - Architecture drafted in planning phase

  **Acceptance Criteria**:
  - [ ] README allows new developer to run project in <5 minutes
  - [ ] Architecture explains all major components
  - [ ] Security section lists risks and future mitigations
  - [ ] Deployment section covers local, PM2, and TLS

  **Manual Verification**:
  - [ ] Follow README from scratch → can run project
  - [ ] Architecture diagrams render correctly

  **Commit**: YES
  - Message: `docs: add readme, architecture, and contributing guide`
  - Files: `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`

---

## Commit Strategy

| After Task | Message | Key Files |
|------------|---------|-----------|
| 0 | `chore: initial commit with .gitignore` | `.gitignore` |
| 1 | `chore: setup monorepo with turborepo` | `package.json`, `turbo.json` |
| 2 | `feat(pty-server): basic websocket server with pty spawn` | `apps/pty-server/src/*` |
| 3 | `feat(pty-server): implement websocket protocol` | `apps/pty-server/src/*` |
| 4 | `feat(pty-server): add lifecycle management` | `apps/pty-server/src/*` |
| 5 | `feat(web): setup next.js with tailwind and shadcn` | `apps/web/*` |
| 6 | `feat(web): add redux toolkit with terminal slice` | `apps/web/lib/store/*` |
| 7 | `feat(web): add xterm.js terminal component` | `apps/web/components/terminal/*` |
| 8 | `feat(web): integrate websocket with xterm.js` | `apps/web/components/*`, `apps/web/hooks/*` |
| 9 | `feat(web): add reconnection logic with overlays` | `apps/web/components/*` |
| 10 | `feat(web): add connection status and polish ui` | `apps/web/components/*` |
| 11 | `feat: add pm2 config and development scripts` | `ecosystem.config.js`, `scripts/*` |
| 12 | `docs: add readme and architecture` | `*.md` |

---

## Success Criteria

### Verification Commands
```bash
# Start development servers
npm run dev
# Expected: Both Next.js and PTY server start

# Build for production
npm run build
# Expected: No errors, both apps build

# Test PTY server directly
OPENCODE_PATH=/path/to/opencode npm run dev --workspace=apps/pty-server
wscat -c ws://localhost:3001
# Expected: Can interact with OpenCode

# Test full stack
npm run dev
# Open http://localhost:3000/terminal
# Expected: OpenCode TUI loads and is fully interactive
```

### Final Checklist
- [ ] OpenCode TUI renders correctly with colors
- [ ] All keyboard shortcuts work (Ctrl+C, arrow keys, etc.)
- [ ] Terminal resizes with browser window
- [ ] Clipboard copy/paste works
- [ ] Disconnect shows reconnection overlay
- [ ] Exit shows session ended message
- [ ] PM2 can manage both processes
- [ ] README enables quick setup

---

## Security Considerations (Future)

**Current Risks (MVP Deferred)**:
1. **No Authentication**: Anyone can connect to WebSocket
2. **No Isolation**: PTY runs with server privileges
3. **No Rate Limiting**: Vulnerable to connection spam
4. **No Audit Logging**: No record of commands
5. **HTTP/WS**: Traffic not encrypted (local only)

**Future Mitigations**:
1. JWT auth on WebSocket upgrade request
2. Container or VM per session
3. Connection limits per IP
4. Command logging with timestamps
5. TLS termination via nginx/Caddy
6. Input validation and sanitization
7. Session timeouts
