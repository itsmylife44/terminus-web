# TERMINAL COMPONENTS KNOWLEDGE BASE

Terminal emulator UI components using ghostty-web.

## COMPONENT INVENTORY

| Component                 | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| `TerminalClient.tsx`      | Main terminal instance, ghostty-web integration |
| `TerminalContainer.tsx`   | Wrapper with consistent styling                 |
| `TerminalTabs.tsx`        | Tab bar with add/close/switch                   |
| `TerminalHeader.tsx`      | Header with connection info                     |
| `ConnectionStatus.tsx`    | Status badge (connected/disconnected)           |
| `DisconnectedOverlay.tsx` | Reconnection UI overlay                         |
| `SessionEndedOverlay.tsx` | Process exit UI overlay                         |

## TERMINAL LIFECYCLE

```
TerminalTabs → TerminalClient (per tab)
                    ↓
            useTerminalConnection hook
                    ↓
            WebSocket to /pty/{ptyId}
                    ↓
            ghostty-web Terminal instance
```

## KEY PATTERNS

- Each tab = separate `TerminalClient` + WebSocket
- Terminal instance stored in `useRef`, not state
- Resize handled via `FitAddon` + PUT /pty/{id}
- Binary data direct to PTY, JSON for control messages

## OVERLAYS

```typescript
// Shown when connectionStatus === 'disconnected'
<DisconnectedOverlay onReconnect={connect} />

// Shown when exitCode !== null
<SessionEndedOverlay exitCode={exitCode} onClose={handleClose} />
```

## STYLING

- Full viewport: `w-screen h-screen` (not `100vh`)
- Dark background: `bg-zinc-900`
- Tab bar at top, terminal fills remaining space
- No scroll - terminal handles its own scrollback

## GOTCHAS

- ghostty-web requires `reactStrictMode: false`
- Terminal resize must debounce (150ms recommended)
- WebSocket reconnect capped at 5 attempts
- Exit code overlay blocks terminal interaction
