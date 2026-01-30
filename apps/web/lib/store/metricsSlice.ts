import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Separate interfaces for nested structures
interface MemoryMetric {
  used: number;
  total: number;
  percent: number;
}

interface DiskMetric {
  used: number;
  total: number;
  percent: number;
}

interface LoadMetric {
  avg1: number;
  avg5: number;
  avg15: number;
}

// Main metrics state interface
export interface MetricsState {
  cpu: number;
  memory: MemoryMetric;
  disk: DiskMetric;
  load: LoadMetric;
  uptime: number;
}

// Initial state
const initialState: MetricsState = {
  cpu: 0,
  memory: {
    used: 0,
    total: 0,
    percent: 0
  },
  disk: {
    used: 0,
    total: 0,
    percent: 0
  },
  load: {
    avg1: 0,
    avg5: 0,
    avg15: 0
  },
  uptime: 0
};

// Create the slice
export const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    updateMetrics: (state, action: PayloadAction<Partial<MetricsState>>) => {
      // Update only provided fields
      return { ...state, ...action.payload };
    },
    clearMetrics: () => initialState
  }
});

// Export actions
export const { updateMetrics, clearMetrics } = metricsSlice.actions;

// Export reducer
export default metricsSlice.reducer;
