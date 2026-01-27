import { configureStore } from '@reduxjs/toolkit';
import terminalReducer from './terminalSlice';
import authReducer from './authSlice';
import sessionsReducer from './sessionsSlice';
import tabsReducer from './tabsSlice';

export const store = configureStore({
  reducer: {
    terminal: terminalReducer,
    auth: authReducer,
    sessions: sessionsReducer,
    tabs: tabsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
