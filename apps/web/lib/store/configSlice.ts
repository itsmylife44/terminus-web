import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { apiRequest } from '@/lib/utils/api-request';
import { openCodeClient, type OpenCodeConfig } from '../api/client';

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
    const result = await apiRequest<OpenCodeConfig>('/api/opencode/config', {
      method: 'PATCH',
      body: JSON.stringify(configUpdates),
    });
    return result;
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
