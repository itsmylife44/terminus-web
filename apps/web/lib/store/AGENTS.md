# STORE KNOWLEDGE BASE

Redux Toolkit state management for terminus-web.

## SLICE INVENTORY

| Slice              | Type  | Purpose                                            |
| ------------------ | ----- | -------------------------------------------------- |
| `authSlice`        | Sync  | Login/logout, sessionStorage credentials           |
| `terminalSlice`    | Sync  | Connection status, errors, reconnect counter       |
| `tabsSlice`        | Sync  | Tab CRUD, max 10 tabs, auto-activate               |
| `updateSlice`      | Sync  | Version check, update progress, auto-update toggle |
| `sessionsSlice`    | Async | OpenCode sessions list (1 thunk)                   |
| `configSlice`      | Async | App config CRUD (2 thunks)                         |
| `ptySessionsSlice` | Async | PTY DB sessions (7 thunks)                         |

## ASYNC THUNK PATTERN

```typescript
export const fetchX = createAsyncThunk<Return, Input, { rejectValue: string }>(
  'slice/fetchX',
  async (input, { rejectWithValue }) => {
    try {
      return await apiCall(input);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed');
    }
  }
);

// In slice:
extraReducers: (builder) => {
  builder
    .addCase(fetchX.pending, (state) => {
      state.isLoading = true;
    })
    .addCase(fetchX.fulfilled, (state, action) => {
      state.isLoading = false;
      state.data = action.payload;
    })
    .addCase(fetchX.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload ?? 'Unknown error';
    });
};
```

## HOOKS

```typescript
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';

const dispatch = useAppDispatch();
const { data, isLoading } = useAppSelector((state) => state.sliceName);
```

## CONVENTIONS

- Async thunks use `rejectWithValue` for typed errors
- Optimistic updates via sync reducers before async confirm
- `isLoading` + `isSaving` separate flags (configSlice)
- `clearError()` reducer in every slice with error state

## GOTCHAS

- `tabsSlice.addTab()` silently fails at 10-tab limit
- `updateSlice.resetUpdateState()` preserves `autoUpdateEnabled`
- `configSlice.saveConfig` uses raw fetch, not API client
- Auth read from `sessionStorage.opencode_auth` in thunks

## STATE SHAPE

```typescript
type RootState = {
  terminal: { connectionStatus, lastError, exitCode, reconnectAttempts }
  auth: { isAuthenticated, username, isLoading, error }
  sessions: { sessions[], isLoading, error, selectedSession }
  tabs: { tabs[], activeTabId }
  config: { config, isLoading, isSaving, error }
  update: { isUpdating, updateAvailable, updateStage, autoUpdateEnabled, ... }
  ptySessions: { sessions[], isLoading, error }
}
```
