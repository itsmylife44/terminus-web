# TERMINUS-WEB KNOWLEDGE BASE

**Generated:** 2025-01-28 | **Commit:** 283dd92 | **Branch:** main

## OVERVIEW

Web-based terminal emulator connecting to OpenCode PTY backend. Next.js 16 + React 19 frontend, dual-process PM2 deployment (port 3000 frontend, 3001 PTY backend).

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

| Task             | Location                                  | Notes                            |
| ---------------- | ----------------------------------------- | -------------------------------- |
| Add page/route   | `apps/web/app/`                           | App Router, pages are `page.tsx` |
| Terminal UI      | `apps/web/components/terminal/`           | Has own AGENTS.md                |
| State management | `apps/web/lib/store/`                     | Has own AGENTS.md                |
| API proxy        | `apps/web/app/api/opencode/`              | Proxies to port 3001             |
| PTY sessions DB  | `apps/web/lib/db/`                        | SQLite via better-sqlite3        |
| WebSocket logic  | `apps/web/hooks/useTerminalConnection.ts` | Complex reconnection             |
| Deployment       | `scripts/install.sh`                      | Ubuntu 22.04+ only               |

## ARCHITECTURE

```
Browser → Caddy (TLS) → Next.js:3000 ─┬─ /api/* → Internal APIs
                                      └─ /pty/* → OpenCode:3001 (PTY WebSocket)
```

- **Frontend**: Redux Toolkit (7 slices), ghostty-web terminal
- **Backend**: OpenCode serve binary, spawns real PTY
- **Database**: SQLite for session persistence
- **Auth**: Basic Auth via sessionStorage (no JWT)

---

## SKILL: REACT 19

### No Manual Memoization

```typescript
// ✅ React Compiler handles optimization
function Component({ items }) {
  const filtered = items.filter(x => x.active);
  const handleClick = (id) => console.log(id);
  return <List items={filtered} onClick={handleClick} />;
}

// ❌ NEVER
const filtered = useMemo(() => items.filter(x => x.active), [items]);
const handleClick = useCallback((id) => console.log(id), []);
```

### Imports

```typescript
// ✅ Named imports
import { useState, useEffect, useRef } from 'react';

// ❌ NEVER
import React from 'react';
import * as React from 'react';
```

### ref as Prop (No forwardRef)

```typescript
// ✅ React 19
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

// ❌ Old way
const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);
```

### use() Hook

```typescript
import { use } from 'react';

// Read promises (suspends until resolved)
const data = use(dataPromise);

// Conditional context
if (showTheme) {
  const theme = use(ThemeContext);
}
```

### useActionState

```typescript
import { useActionState } from "react";

function Form() {
  const [state, action, isPending] = useActionState(submitForm, null);
  return (
    <form action={action}>
      <button disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
    </form>
  );
}
```

---

## SKILL: NEXT.JS 15+

### App Router Files

```
app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # Route page
├── loading.tsx         # Suspense fallback
├── error.tsx           # Error boundary
├── not-found.tsx       # 404
├── (group)/            # Route group (no URL)
└── api/route.ts        # API handler
```

### Server Components (Default)

```typescript
// No directive needed
export default async function Page() {
  const data = await db.query();
  return <Component data={data} />;
}
```

### Server Actions

```typescript
// app/actions.ts
'use server';

import { revalidatePath, redirect } from 'next/navigation';

export async function createUser(formData: FormData) {
  await db.users.create({ data: { name: formData.get('name') } });
  revalidatePath('/users');
  redirect('/users');
}
```

### Route Handlers

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json(await db.users.findMany());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json(await db.users.create({ data: body }), { status: 201 });
}
```

---

## SKILL: TYPESCRIPT

### Const Types Pattern (REQUIRED)

```typescript
// ✅ ALWAYS: const object → derive type
const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];

// ❌ NEVER: direct union
type Status = 'active' | 'inactive';
```

### Flat Interfaces

```typescript
// ✅ Nested → separate interface
interface UserAddress {
  street: string;
  city: string;
}
interface User {
  id: string;
  address: UserAddress;
}

// ❌ Inline nesting
interface User {
  address: { street: string };
}
```

### Never Use `any`

```typescript
// ✅ Use unknown
function parse(input: unknown): User { ... }

// ✅ Use generics
function first<T>(arr: T[]): T | undefined { return arr[0]; }

// ❌ NEVER
function parse(input: any): any { }
```

### Import Types

```typescript
import type { User } from './types';
import { createUser, type Config } from './utils';
```

---

## SKILL: TAILWIND 4

### Critical Rules

```typescript
// ❌ NEVER: var() in className
<div className="bg-[var(--color)]" />

// ❌ NEVER: hex colors
<div className="text-[#ffffff]" />

// ✅ ALWAYS: semantic classes
<div className="bg-primary text-white" />
```

### cn() Usage

```typescript
import { cn } from "@/lib/utils";

// ✅ Conditional classes
<div className={cn("base", isActive && "active")} />

// ✅ Merge with overrides
<button className={cn("px-4", className)} />

// ❌ Static only - don't use cn()
<div className="flex gap-2" />  // No cn() needed
```

### Dynamic Values

```typescript
// ✅ style prop for dynamic values
<div style={{ width: `${percentage}%` }} />

// ✅ var() ONLY for libraries that can't use className
const CHART_COLORS = { primary: "var(--color-primary)" };
<XAxis tick={{ fill: CHART_COLORS.primary }} />
```

---

## CONVENTIONS

| Area        | Convention                                                     |
| ----------- | -------------------------------------------------------------- |
| Imports     | `import type { X }` for types, named imports for React         |
| State       | Redux slices in `lib/store/`, async thunks for API calls       |
| Styling     | Tailwind 4 + shadcn/ui, HSL CSS variables, no hex in className |
| Forms       | `fieldset`/`legend` for button groups (accessibility)          |
| Unused vars | Prefix with `_` to suppress lint (e.g., `_error`)              |

## ANTI-PATTERNS

| Never Do                 | Reason                                   |
| ------------------------ | ---------------------------------------- |
| `as any`, `@ts-ignore`   | Use proper types or `unknown`            |
| `useMemo`, `useCallback` | React Compiler handles it (when enabled) |
| `forwardRef`             | Use ref as prop in React 19              |
| Hex colors in className  | Use Tailwind semantic colors             |
| `var()` in className     | Use Tailwind classes                     |
| Direct union types       | Use const object pattern                 |
| Commit without request   | User controls git                        |

## GOTCHAS

- **Tab limit**: Max 10 tabs, silently fails on 11th
- **Auth storage**: Plain credentials in `sessionStorage.opencode_auth`
- **Update mutex**: In-memory flag, not thread-safe for multi-process
- **API 401**: Dispatches `opencode:auth_error` window event, not throw
- **reactStrictMode**: Disabled for ghostty-web compatibility
- **WebSocket reconnect**: 5 attempts max, exponential backoff (1s-16s)
- **useCallback retained**: React Compiler not enabled yet in this project

## COMMANDS

```bash
npm run dev          # Start dev (runs scripts/dev.sh)
npm run build        # Turbo build all workspaces
npm run pm2:start    # Start PM2 (production)
npm run pm2:logs     # Tail PM2 logs
npm run lint         # ESLint check
npm run format       # Prettier format
```

## ENVIRONMENT

| Variable                   | Purpose                                            |
| -------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_OPENCODE_URL` | Frontend WebSocket URL                             |
| `OPENCODE_INTERNAL_URL`    | Server-side proxy target (default: localhost:3001) |
| `DATABASE_PATH`            | SQLite path (default: ./data/terminus.db)          |
| `TERMINUS_WEB_PORT`        | Frontend port (default: 3000)                      |
| `OPENCODE_SERVE_PORT`      | Backend port (default: 3001)                       |

## DEPLOYMENT

Production uses `scripts/install.sh`:

1. Creates `terminus` user
2. Installs Node 20, PM2, Caddy
3. Configures reverse proxy (Caddy)
4. Enables HTTPS (Let's Encrypt or internal)
5. Blocks direct 3000/3001 access via UFW

Update process (`/api/update`): git pull → npm install → npm build → pm2 restart
