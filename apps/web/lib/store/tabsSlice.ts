import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Tab {
  id: string; // Unique tab identifier (same as DB session id for saved sessions)
  ptyId: string; // PTY session ID from backend (for WebSocket connection)
  title: string; // Tab display title
  isConnected: boolean; // Whether WebSocket is currently connected
}

export interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
}

const initialState: TabsState = {
  tabs: [],
  activeTabId: null,
};

/**
 * Helper function to generate unique tab IDs
 * Uses timestamp + random suffix for uniqueness
 */
const generateTabId = (): string => {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    /**
     * Add a new tab to the tabs list
     * Enforces max 10 tabs limit - does not add if limit reached
     * Automatically sets as active and becomes the active tab
     */
    addTab: (state, action: PayloadAction<{ id?: string; ptyId: string; title?: string }>) => {
      // Enforce max 10 tabs - silently return if limit reached
      if (state.tabs.length >= 10) {
        return;
      }

      const newTab: Tab = {
        id: action.payload.id || generateTabId(),
        ptyId: action.payload.ptyId,
        title: action.payload.title || `Terminal ${state.tabs.length + 1}`,
        isConnected: false,
      };

      state.tabs.push(newTab);

      // Always set new tab as active
      state.activeTabId = newTab.id;
    },

    /**
     * Remove a tab by ID
     * Adjusts activeTabId if the removed tab was active
     */
    removeTab: (state, action: PayloadAction<string>) => {
      const tabIndex = state.tabs.findIndex((tab) => tab.id === action.payload);

      if (tabIndex === -1) {
        return; // Tab not found, do nothing
      }

      state.tabs.splice(tabIndex, 1);

      // If removed tab was active, set new active tab
      if (state.activeTabId === action.payload) {
        if (state.tabs.length > 0) {
          // Set to next tab if available, otherwise previous tab
          const newActiveIndex = Math.min(tabIndex, state.tabs.length - 1);
          state.activeTabId = state.tabs[newActiveIndex].id;
        } else {
          // No tabs left
          state.activeTabId = null;
        }
      }
    },

    /**
     * Set the active tab by ID
     */
    setActiveTab: (state, action: PayloadAction<string>) => {
      const tabExists = state.tabs.some((tab) => tab.id === action.payload);
      if (tabExists) {
        state.activeTabId = action.payload;
      }
    },

    /**
     * Update a tab's title by ID
     */
    updateTabTitle: (state, action: PayloadAction<{ id: string; title: string }>) => {
      const tab = state.tabs.find((t) => t.id === action.payload.id);
      if (tab) {
        tab.title = action.payload.title;
      }
    },

    /**
     * Update a tab's PTY ID (after connection established)
     */
    updateTabPtyId: (state, action: PayloadAction<{ id: string; ptyId: string }>) => {
      const tab = state.tabs.find((t) => t.id === action.payload.id);
      if (tab) {
        tab.ptyId = action.payload.ptyId;
      }
    },

    /**
     * Set a tab's connection status
     */
    setTabConnected: (state, action: PayloadAction<{ id: string; isConnected: boolean }>) => {
      const tab = state.tabs.find((t) => t.id === action.payload.id);
      if (tab) {
        tab.isConnected = action.payload.isConnected;
      }
    },
  },
});

export const { addTab, removeTab, setActiveTab, updateTabTitle, updateTabPtyId, setTabConnected } =
  tabsSlice.actions;

export default tabsSlice.reducer;
