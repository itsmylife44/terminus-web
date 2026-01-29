# Hooks: React 19 Memoization Patterns

⚠️ **CRITICAL: Do NOT Remove These useCallback Instances**

In React 19, the React Compiler handles most memoization automatically. However, there are specific cases where manual memoization using `useCallback` is required for **correctness**, not just performance.

## Why These useCallback Calls Must Stay

The following `useCallback` instances follow the "memoization-for-correctness" pattern. They are used as dependencies in `useEffect` or other hooks where an identity change would trigger an infinite loop or premature re-execution of side effects (like WebSocket reconnections or SSE initializations).

The React Compiler is designed to be safe and may not always optimize these specific patterns if it cannot statically guarantee that the function identity is stable across re-renders when used as a dependency for side effects.

## The 7 Protected Instances

### 1. `useTerminalConnection.ts`: `connect`

- **Location**: Line 43
- **Reason**: This function is a dependency for a `useEffect` that handles auto-reconnect logic. If `connect` were recreated on every render, it would trigger a new connection attempt, closing the existing socket and creating a loop of constant reconnections.

### 2. `useVersionCheck.ts`: `checkVersion`

- **Location**: Line 51
- **Reason**: Used as a dependency in the initial `useEffect` (Line 114) to trigger the version check on mount. Since it's also used by `checkForUpdates`, its identity must remain stable to avoid re-triggering the mount effect.

### 3. `useVersionCheck.ts`: `checkForUpdates`

- **Location**: Line 110
- **Reason**: Exposed as part of the hook's return object. Stable identity ensures that components consuming this hook don't re-render unnecessarily or trigger their own effects if they include `checkForUpdates` in their dependency arrays.

### 4. `useSSE.ts`: `getReconnectDelay`

- **Location**: Line 39
- **Reason**: Used inside `connectSSE`. Stable identity prevents unnecessary re-calculations during reconnection attempts and ensures consistent backoff timing.

### 5. `useSSE.ts`: `handleSSEEvent`

- **Location**: Line 49
- **Reason**: This is the core message handler for the `EventSource`. It is added as an event listener in `connectSSE`. If its identity changed, the listener would need to be removed and re-added, potentially missing events during the swap.

### 6. `useSSE.ts`: `closeSSE`

- **Location**: Line 100
- **Reason**: Used for cleanup in `useEffect` and manually in `connectSSE`. Stable identity ensures that cleanup logic is predictable and doesn't trigger effect re-runs.

### 7. `useSSE.ts`: `connectSSE`

- **Location**: Line 112
- **Reason**: Primary entry point for the SSE connection. Used in the main `useEffect` (Line 174). An unstable identity here would cause the SSE connection to drop and reconnect on every component re-render.

## When Can useCallback Be Removed?

In React 19, you can generally remove `useCallback` when:

1. The function is only passed to child components for performance (React Compiler handles this).
2. The function is NOT used in a `useEffect`, `useMemo`, or `useCallback` dependency array.

## For New Hooks

- **Default to No Memoization**: Write your functions normally. Let the React Compiler handle optimization.
- **Manual Memoization for Correctness**: Only use `useCallback` if the function is a dependency for a `useEffect` that manages a long-lived resource (WebSocket, Timer, Event Listener) where identity stability is required to prevent connection cycles.

## References

- [React Compiler: Debugging Manual Memoization](https://react.dev/learn/react-compiler/debugging)
- [React Compiler: Introduction](https://react.dev/learn/react-compiler/introduction)
- [React 19: useActionState and Actions](https://react.dev/reference/react/useActionState)
