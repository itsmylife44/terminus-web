# TERMINUS-WEB AGENT GUIDE

## OVERVIEW

Web-based terminal emulator connecting to OpenCode PTY backend. Next.js 15 + React 19 frontend.
Dual-process PM2 deployment (port 3000 frontend, 3001 PTY backend).

## STRUCTURE

```
terminus-web/
├── apps/web/              # Next.js frontend (main codebase)
│   ├── app/               # App Router pages + API routes
│   ├── components/        # React components (terminal/, layout/, ui/)
│   ├── hooks/             # WebSocket, SSE, version hooks
│   └── lib/               # store/, api/, db/, utils
├── packages/shared/       # Shared TypeScript types
├── scripts/               # install.sh, dev.sh, uninstall.sh
└── ecosystem.config.js    # PM2 dual-process config
```

## WHERE TO LOOK

| Task             | Location                        | Notes                            |
| :--------------- | :------------------------------ | :------------------------------- |
| Add page/route   | `apps/web/app/`                 | App Router, pages are `page.tsx` |
| Terminal UI      | `apps/web/components/terminal/` | Core terminal logic              |
| State management | `apps/web/lib/store/`           | Redux Toolkit slices             |
| API proxy        | `apps/web/app/api/opencode/`    | Proxies to port 3001             |
| PTY sessions DB  | `apps/web/lib/db/`              | SQLite via better-sqlite3        |

## ARCHITECTURE

```
Browser → Caddy (TLS) → Next.js:3000 ─┬─ /api/* → Internal APIs
                                      └─ /pty/* → OpenCode:3001 (PTY WebSocket)
```

## BUILD & TEST COMMANDS

| Command          | Action                                                            |
| :--------------- | :---------------------------------------------------------------- |
| `npm run dev`    | Start development environment (via `scripts/dev.sh`)              |
| `npm run build`  | Build all workspaces with Turbo                                   |
| `npm run lint`   | Run ESLint across all projects                                    |
| `npm run test`   | Run tests (Manual verification required; no framework configured) |
| `npm run format` | Prettier write all files                                          |

**Single Test Execution:**

- API: `curl -I http://localhost:3000/api/health`
- WebSocket: Check network tab for `ws://.../pty` upgrade success.

## CODE STYLE GUIDELINES

### 1. IMPORTS

- Always use **type imports** for types.
- **Named imports** for React hooks (NEVER default `React`).

```typescript
import { useState, useEffect } from 'react';
import type { NextRequest } from 'next/server';
import type { Monaco } from '@monaco-editor/react';
import { createUser, type Config } from './utils';
```

### 2. TYPESCRIPT PATTERNS

- **Const Object Pattern**: Required for enums/status codes.
- **Flat Interfaces**: One level depth; nested objects must be dedicated interfaces.
- **Never use `any`**: Use `unknown` or generics for flexible types.

```typescript
const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
} as const;
type ConnectionStatus = (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];

interface UserSession {
  id: string;
  metadata: SessionMetadata; // Separate interface
}
```

### 3. ERROR HANDLING

- **API Routes**: Standardized try-catch with JSON error responses.
- **Components**: Local `error` state for UI feedback.

```typescript
// app/api/example/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return Response.json({ success: true, data: body });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Operation failed';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
```

### 4. NAMING CONVENTIONS

| Asset       | Convention       | Example                    |
| :---------- | :--------------- | :------------------------- |
| Components  | PascalCase.tsx   | `TerminalWindow.tsx`       |
| Utilities   | camelCase.ts     | `sessionUtils.ts`          |
| API Routes  | `route.ts`       | `app/api/session/route.ts` |
| Constants   | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`          |
| Unused Vars | Prefix with `_`  | `_error`                   |

### 5. REACT 19 PATTERNS

- **No manual memoization**: React Compiler handles `useMemo`/`useCallback`.
- **ref as Prop**: Direct `ref` prop passing (no `forwardRef`).
- **use() Hook**: Use for reading promises or conditional context.
- **Named Imports Only**: `import { useState } from 'react'`.

### 6. NEXT.JS 15+ CONVENTIONS

- **Server Components**: Default; `"use client"` only when hooks/interactivity needed.
- **Server Actions**: Mutations using `'use server'`.
- **App Router**: Follow directory-based routing (`page.tsx`, `layout.tsx`).

### 7. TAILWIND CSS 4 PATTERNS

- **No hex/var()**: Use semantic classes (`bg-primary`) or style props for dynamic values.
- **cn() usage**: Only for conditional/merged classes.

```typescript
<div className={cn("flex gap-2", isActive && "bg-accent")} style={{ opacity: alpha }} />
```

### 8. REDUX TOOLKIT PATTERNS

- **Typed Hooks**: Always use `useAppDispatch` and `useAppSelector`.
- **Async Thunks**: Typed error handling with `rejectWithValue`.

```typescript
export const fetchData = createAsyncThunk<Data, Args, { rejectValue: string }>(
  'slice/fetch',
  async (args, { rejectWithValue }) => {
    try {
      return await api.fetch(args);
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed');
    }
  }
);
```

## ANTI-PATTERNS TO AVOID

- `as any` or `@ts-ignore`: Use proper interfaces or `unknown`.
- Inline styles: Use Tailwind (except for truly dynamic values).
- Default React imports: Use `import { useState } from 'react'`.
- Proactive commits: Only commit when explicitly requested.

## PROJECT GOTCHAS

- **Tab limit**: UI restricts to 10 tabs; silent restriction on the 11th.
- **Auth**: Credentials in `sessionStorage.opencode_auth` (plaintext).
- **React Strict Mode**: Disabled for `ghostty-web` compatibility.
- **WebSocket**: 5 attempts max with exponential backoff (1s-16s).
- **Update Mutex**: In-memory flag; not cross-process safe.
