/**
 * PTY Sessions Redux Slice
 * Manages PTY terminal sessions stored in the database
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchPtySessions as apiFetchPtySessions,
  createPtySession as apiCreatePtySession,
  updatePtySession as apiUpdatePtySession,
  deletePtySession as apiDeletePtySession,
  PtySession,
  CreatePtySessionInput,
  UpdatePtySessionInput,
  PtySessionStatus,
} from '@/lib/api/pty-sessions';

export interface PtySessionsState {
  sessions: PtySession[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PtySessionsState = {
  sessions: [],
  isLoading: false,
  error: null,
};

/**
 * Fetch all PTY sessions from the database
 */
export const fetchPtySessions = createAsyncThunk<PtySession[], boolean | undefined>(
  'ptySessions/fetch',
  async (includeAll = false) => {
    return apiFetchPtySessions(includeAll);
  }
);

/**
 * Create a new PTY session in the database
 */
export const createPtySession = createAsyncThunk<PtySession, CreatePtySessionInput>(
  'ptySessions/create',
  async (input) => {
    return apiCreatePtySession(input);
  }
);

/**
 * Update a PTY session in the database
 */
export const updatePtySession = createAsyncThunk<
  PtySession,
  { id: string; input: UpdatePtySessionInput }
>('ptySessions/update', async ({ id, input }) => {
  return apiUpdatePtySession(id, input);
});

/**
 * Delete a PTY session from the database
 */
export const deletePtySession = createAsyncThunk<string, string>(
  'ptySessions/delete',
  async (id) => {
    await apiDeletePtySession(id);
    return id;
  }
);

/**
 * Mark a session as disconnected
 */
export const disconnectSession = createAsyncThunk<PtySession, string>(
  'ptySessions/disconnect',
  async (id) => {
    return apiUpdatePtySession(id, { status: 'disconnected' });
  }
);

/**
 * Mark a session as closed
 */
export const closeSession = createAsyncThunk<PtySession, string>(
  'ptySessions/close',
  async (id) => {
    return apiUpdatePtySession(id, { status: 'closed' });
  }
);

/**
 * Reactivate a session
 */
export const reactivateSession = createAsyncThunk<PtySession, string>(
  'ptySessions/reactivate',
  async (id) => {
    return apiUpdatePtySession(id, { status: 'active' });
  }
);

export const ptySessionsSlice = createSlice({
  name: 'ptySessions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Optimistic update for status changes
    setSessionStatus: (state, action: PayloadAction<{ id: string; status: PtySessionStatus }>) => {
      const session = state.sessions.find((s) => s.id === action.payload.id);
      if (session) {
        session.status = action.payload.status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch sessions
      .addCase(fetchPtySessions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPtySessions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sessions = action.payload;
      })
      .addCase(fetchPtySessions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch sessions';
      })

      // Create session
      .addCase(createPtySession.fulfilled, (state, action) => {
        state.sessions.unshift(action.payload);
      })
      .addCase(createPtySession.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create session';
      })

      // Update session
      .addCase(updatePtySession.fulfilled, (state, action) => {
        const index = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.sessions[index] = action.payload;
        }
      })

      // Delete session
      .addCase(deletePtySession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter((s) => s.id !== action.payload);
      })

      // Disconnect session
      .addCase(disconnectSession.fulfilled, (state, action) => {
        const index = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.sessions[index] = action.payload;
        }
      })

      // Close session
      .addCase(closeSession.fulfilled, (state, action) => {
        const index = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.sessions[index] = action.payload;
        }
      })

      // Reactivate session
      .addCase(reactivateSession.fulfilled, (state, action) => {
        const index = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.sessions[index] = action.payload;
        }
      });
  },
});

export const { clearError, setSessionStatus } = ptySessionsSlice.actions;
export default ptySessionsSlice.reducer;

// Re-export types
export type { PtySession, PtySessionStatus };
