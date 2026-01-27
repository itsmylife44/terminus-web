import { configureStore } from '@reduxjs/toolkit';
import terminalReducer from './terminalSlice';
import authReducer from './authSlice';
import sessionsReducer from './sessionsSlice';
import tabsReducer from './tabsSlice';
import configReducer from './configSlice';
import updateReducer from './updateSlice';

export const store = configureStore({
  reducer: {
    terminal: terminalReducer,
    auth: authReducer,
    sessions: sessionsReducer,
    tabs: tabsReducer,
    config: configReducer,
    update: updateReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
