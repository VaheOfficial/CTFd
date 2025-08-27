import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '@/lib/api/client'
import { loadAllStats, clearStats } from './statsSlice'

export interface User {
  id: string
  username: string
  email: string
  role: string
  total_points?: number
  rank?: number
  created_at?: string
  last_login?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  requiresTwoFactor: boolean
  twoFactorUsername: string | null
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  requiresTwoFactor: false,
  twoFactorUsername: null,
}

// Async thunks
export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getMe()
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password, two_factor_code }: { 
    username: string; 
    password: string; 
    two_factor_code?: string 
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.login({ username, password, totp_code: undefined, two_factor_code })
      if (response.error) {
        // Check if 2FA is required
        if (response.error.status === 202) {
          return rejectWithValue({ 
            requiresTwoFactor: true, 
            message: response.error.message,
            username: username
          })
        }
        throw new Error(response.error.message)
      }
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const signup = createAsyncThunk(
  'auth/signup',
  async ({ username, email, password }: { username: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.signup({ username, email, password })
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload
      state.isAuthenticated = true
      // Store in localStorage for API calls
      localStorage.setItem('auth_token', action.payload)
      // Update API client with new token 
      if (typeof window !== 'undefined') {
        import('@/lib/api/client').then(({ apiClient }) => {
          apiClient.setToken(action.payload)
        })
      }
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      state.requiresTwoFactor = false
      state.twoFactorUsername = null
      // Clear from localStorage
      localStorage.removeItem('auth_token')
    },
    setTwoFactorRequired: (state, action: PayloadAction<{ username: string }>) => {
      state.requiresTwoFactor = true
      state.twoFactorUsername = action.payload.username
      state.isLoading = false
      state.error = null
    },
    clearTwoFactor: (state) => {
      state.requiresTwoFactor = false
      state.twoFactorUsername = null
    },
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchMe
      .addCase(fetchMe.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload as User
        state.isAuthenticated = true
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        // If fetchMe fails, clear auth state
        state.user = null
        state.token = null
        state.isAuthenticated = false
        localStorage.removeItem('auth_token')
      })
      // login
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        if (action.payload) {
          state.user = action.payload.user as unknown as User
          state.token = action.payload.access_token
          state.isAuthenticated = true
          localStorage.setItem('auth_token', action.payload.access_token)
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        const payload = action.payload as any
        
        // Check if 2FA is required
        if (payload?.requiresTwoFactor) {
          state.requiresTwoFactor = true
          state.twoFactorUsername = payload?.username || null
          state.error = null
          // Ensure user is not marked as authenticated during 2FA
          state.isAuthenticated = false
          state.token = null
          // Clear any existing token from localStorage
          localStorage.removeItem('auth_token')
          // Also clear from API client
          if (typeof window !== 'undefined') {
            // Import dynamically to avoid SSR issues
            import('@/lib/api/client').then(({ apiClient }) => {
              apiClient.setToken(null)
            })
          }
        } else {
          state.error = payload?.message || action.payload as string
        }
      })
      // signup
      .addCase(signup.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isLoading = false
        if (action.payload) {
          state.user = action.payload.user as unknown as User
          state.token = action.payload.access_token
          state.isAuthenticated = true
          localStorage.setItem('auth_token', action.payload.access_token)
        }
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setToken, logout, clearError, setUser, setTwoFactorRequired, clearTwoFactor } = authSlice.actions
export default authSlice.reducer
