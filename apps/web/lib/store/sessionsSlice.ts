import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { openCodeClient, type OpenCodeSession } from '../api/client';

export interface SessionsState {
  sessions: OpenCodeSession[];
  isLoading: boolean;
  error: string | null;
  selectedSession: string | null;
}

const initialState: SessionsState = {
  sessions: [],
  isLoading: false,
  error: null,
  selectedSession: null,
};

/**
 * Async thunk to fetch sessions from API
 * Calls openCodeClient.getSessions() without pagination for now
 */
export const fetchSessions = createAsyncThunk<OpenCodeSession[], void, { rejectValue: string }>(
  'sessions/fetchSessions',
  async (_, { rejectWithValue }) => {
    try {
      const sessions = await openCodeClient.getSessions();
      return sessions;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch sessions';
      return rejectWithValue(message);
    }
  }
);

export const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    /**
     * Set the currently selected session by ID
     */
    setSelectedSession: (state, action: PayloadAction<string | null>) => {
      state.selectedSession = action.payload;
    },

    /**
     * Update a specific session in the array by ID
     */
    updateSession: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<OpenCodeSession> }>
    ) => {
      const sessionIndex = state.sessions.findIndex((s) => s.id === action.payload.id);
      if (sessionIndex !== -1) {
        state.sessions[sessionIndex] = {
          ...state.sessions[sessionIndex],
          ...action.payload.updates,
        };
      }
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchSessions pending state
      .addCase(fetchSessions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      // Handle fetchSessions success
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sessions = action.payload;
        state.error = null;
      })
      // Handle fetchSessions failure
      .addCase(fetchSessions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch sessions';
      });
  },
});

export const { setSelectedSession, updateSession, clearError } = sessionsSlice.actions;
export default sessionsSlice.reducer;
