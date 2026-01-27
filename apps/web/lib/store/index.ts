import { configureStore } from '@reduxjs/toolkit';
import terminalReducer from './terminalSlice';
import authReducer from './authSlice';
import sessionsReducer from './sessionsSlice';

export const store = configureStore({
  reducer: {
    terminal: terminalReducer,
    auth: authReducer,
    sessions: sessionsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
