import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  username: null,
  isLoading: false,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ username: string; password?: string }>) => {
      state.isAuthenticated = true;
      state.username = action.payload.username;
      state.error = null;

      // Store credentials in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'opencode_auth',
          JSON.stringify({
            username: action.payload.username,
            password: action.payload.password || '',
          })
        );
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.username = null;
      state.error = null;

      // Clear credentials from sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('opencode_auth');
      }
    },
    setAuthError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { login, logout, setAuthError, setLoading } = authSlice.actions;
export default authSlice.reducer;
