import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TerminalState {
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
    setConnectionStatus: (
      state,
      action: PayloadAction<TerminalState['connectionStatus']>
    ) => {
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

export const {
  setConnectionStatus,
  setError,
  setExitCode,
  incrementReconnectAttempts,
  resetReconnectAttempts,
} = terminalSlice.actions;

export default terminalSlice.reducer;
