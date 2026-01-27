import { configureStore } from '@reduxjs/toolkit';
import terminalReducer from './terminalSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    terminal: terminalReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
