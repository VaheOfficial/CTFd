import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '@/lib/api/client'

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
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
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
  async ({ username, password }: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.login({ username, password })
      if (response.error) {
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
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      // Clear from localStorage
      localStorage.removeItem('auth_token')
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
        state.user = action.payload
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
        state.token = action.payload.access_token
        state.isAuthenticated = true
        localStorage.setItem('auth_token', action.payload.access_token)
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // signup
      .addCase(signup.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isLoading = false
        state.token = action.payload.access_token
        state.isAuthenticated = true
        localStorage.setItem('auth_token', action.payload.access_token)
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setToken, logout, clearError, setUser } = authSlice.actions
export default authSlice.reducer
