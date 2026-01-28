import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { APP_VERSION } from '@/lib/version/versionChecker';

export type UpdateStage =
  | 'preparing'
  | 'pulling'
  | 'installing'
  | 'building'
  | 'restarting'
  | 'complete'
  | 'error'
  | 'rolling_back';

export interface UpdateState {
  isChecking: boolean;
  isUpdating: boolean;
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string | null;
  releaseUrl: string | null;
  updateStage: UpdateStage | null;
  updateProgress: number;
  updateError: string | null;
  autoUpdateEnabled: boolean;
  showConfirmDialog: boolean;
  isAutoUpdateTrigger: boolean;
}

const getInitialAutoUpdateEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const stored = localStorage.getItem('terminus_auto_update');
    return stored ? JSON.parse(stored) : false;
  } catch {
    return false;
  }
};

const initialState: UpdateState = {
  isChecking: false,
  isUpdating: false,
  updateAvailable: false,
  currentVersion: APP_VERSION,
  latestVersion: null,
  releaseUrl: null,
  updateStage: null,
  updateProgress: 0,
  updateError: null,
  autoUpdateEnabled: getInitialAutoUpdateEnabled(),
  showConfirmDialog: false,
  isAutoUpdateTrigger: false,
};

export const updateSlice = createSlice({
  name: 'update',
  initialState,
  reducers: {
    setUpdateAvailable: (
      state,
      action: PayloadAction<{ latestVersion: string; releaseUrl: string }>
    ) => {
      state.updateAvailable = true;
      state.latestVersion = action.payload.latestVersion;
      state.releaseUrl = action.payload.releaseUrl;
    },
    startUpdate: (state) => {
      state.isUpdating = true;
      state.updateError = null;
      state.updateProgress = 0;
      state.updateStage = 'preparing';
      state.showConfirmDialog = false;
      state.isAutoUpdateTrigger = false;
    },
    setUpdateStage: (
      state,
      action: PayloadAction<{ stage: UpdateStage; progress: number; message?: string }>
    ) => {
      state.updateStage = action.payload.stage;
      state.updateProgress = action.payload.progress;
      if (action.payload.message) {
        state.updateError = null; // Clear error when setting stage with message
      }
    },
    setUpdateError: (state, action: PayloadAction<string>) => {
      state.updateError = action.payload;
      state.updateStage = 'error';
      state.isUpdating = false;
    },
    completeUpdate: (state, action: PayloadAction<string>) => {
      state.isUpdating = false;
      state.updateStage = 'complete';
      state.updateProgress = 100;
      state.currentVersion = action.payload;
      state.updateAvailable = false;
      state.latestVersion = null;
      state.releaseUrl = null;
      state.updateError = null;
    },
    toggleAutoUpdate: (state) => {
      state.autoUpdateEnabled = !state.autoUpdateEnabled;

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('terminus_auto_update', JSON.stringify(state.autoUpdateEnabled));
      }
    },
    showConfirmDialog: (state, action: PayloadAction<boolean>) => {
      state.showConfirmDialog = true;
      state.isAutoUpdateTrigger = action.payload;
    },
    hideConfirmDialog: (state) => {
      state.showConfirmDialog = false;
      state.isAutoUpdateTrigger = false;
    },
    resetUpdateState: (state) => {
      state.isChecking = false;
      state.isUpdating = false;
      state.updateAvailable = false;
      state.latestVersion = null;
      state.releaseUrl = null;
      state.updateStage = null;
      state.updateProgress = 0;
      state.updateError = null;
      state.showConfirmDialog = false;
      state.isAutoUpdateTrigger = false;
      // Note: autoUpdateEnabled is NOT reset - it persists
    },
  },
});

export const {
  setUpdateAvailable,
  startUpdate,
  setUpdateStage,
  setUpdateError,
  completeUpdate,
  toggleAutoUpdate,
  showConfirmDialog,
  hideConfirmDialog,
  resetUpdateState,
} = updateSlice.actions;

export default updateSlice.reducer;
