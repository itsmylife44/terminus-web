import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { openCodeClient, OpenCodeConfig } from '../api/client';

export interface ConfigState {
  config: OpenCodeConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: ConfigState = {
  config: null,
  isLoading: false,
  isSaving: false,
  error: null,
};

/**
 * Async thunk to fetch configuration from API
 * Calls openCodeClient.getConfig() to get current config
 */
export const fetchConfig = createAsyncThunk<OpenCodeConfig, void, { rejectValue: string }>(
  'config/fetchConfig',
  async (_, { rejectWithValue }) => {
    try {
      const config = await openCodeClient.getConfig();
      return config;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch config';
      return rejectWithValue(message);
    }
  }
);

/**
 * Async thunk to save configuration changes to API
 * Calls PATCH /config with updated config
 */
export const saveConfig = createAsyncThunk<
  OpenCodeConfig,
  Partial<OpenCodeConfig>,
  { rejectValue: string }
>('config/saveConfig', async (configUpdates, { rejectWithValue }) => {
  try {
    // Note: Assuming openCodeClient will have a saveConfig or updateConfig method
    // For now, we'll call fetch directly similar to getConfig pattern
    const response = await fetch('/api/opencode/config', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && sessionStorage.getItem('opencode_auth')
          ? (() => {
              const { username, password } = JSON.parse(sessionStorage.getItem('opencode_auth')!);
              return {
                Authorization: `Basic ${btoa(`${username}:${password}`)}`,
              };
            })()
          : {}),
      },
      body: JSON.stringify(configUpdates),
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('opencode:auth_error'));
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : configUpdates;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save config';
    return rejectWithValue(message);
  }
});

export const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    /**
     * Update local config state without saving to server
     * Useful for optimistic updates or intermediate state changes
     */
    updateConfig: (state, action: PayloadAction<Partial<OpenCodeConfig>>) => {
      if (state.config) {
        state.config = {
          ...state.config,
          ...action.payload,
        };
      }
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Reset config state to initial state
     */
    resetConfig: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchConfig pending state
      .addCase(fetchConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      // Handle fetchConfig success
      .addCase(fetchConfig.fulfilled, (state, action) => {
        state.isLoading = false;
        state.config = action.payload;
        state.error = null;
      })
      // Handle fetchConfig failure
      .addCase(fetchConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch config';
      })
      // Handle saveConfig pending state
      .addCase(saveConfig.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      // Handle saveConfig success
      .addCase(saveConfig.fulfilled, (state, action) => {
        state.isSaving = false;
        state.config = action.payload;
        state.error = null;
      })
      // Handle saveConfig failure
      .addCase(saveConfig.rejected, (state, action) => {
        state.isSaving = false;
        state.error = (action.payload as string) || 'Failed to save config';
      });
  },
});

export const { updateConfig, clearError, resetConfig } = configSlice.actions;
export default configSlice.reducer;
