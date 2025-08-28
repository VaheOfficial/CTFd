import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '@/lib/api/client'

export interface BadgeItem {
  id: string
  code: string
  name: string
  description: string
  icon_key: string
  awarded_at: string
  reason?: string
}

export interface SeasonItem {
  id: string
  name: string
  start_at: string
  end_at: string
  total_weeks: number
  description?: string
  theme?: string
  is_active: boolean
  current_week?: number | null
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  total_points: number
  challenges_solved: number
  last_submission?: string | null
  is_current_user?: boolean
}

export interface LeaderboardData {
  season_id: string
  season_name: string
  total_participants: number
  entries: LeaderboardEntry[]
  current_user_rank?: number | null
  last_updated: string
}

interface StatsState {
  isLoading: boolean
  error: string | null
  me: any | null
  badges: BadgeItem[]
  seasons: SeasonItem[]
  activeSeasonId: string | null
  leaderboard: LeaderboardData | null
  admin: {
    isLoading: boolean
    error: string | null
    total_users: number
    active_seasons: number
    total_challenges: number
    pending_challenges: number
    this_week_submissions: number
    ai_generations_today: number
  }
}

const initialState: StatsState = {
  isLoading: false,
  error: null,
  me: null,
  badges: [],
  seasons: [],
  activeSeasonId: null,
  leaderboard: null,
  admin: {
    isLoading: false,
    error: null,
    total_users: 0,
    active_seasons: 0,
    total_challenges: 0,
    pending_challenges: 0,
    this_week_submissions: 0,
    ai_generations_today: 0,
  },
}

export const loadAllStats = createAsyncThunk<any, void>(
  'stats/loadAll',
  async (_, { rejectWithValue }) => {
    try {
      const [meRes, seasonsRes, badgesRes] = await Promise.all([
        apiClient.getMe(),
        apiClient.getSeasons(),
        apiClient.getBadges(),
      ])

      if (meRes.error) throw new Error(meRes.error.message)
      if (seasonsRes.error) throw new Error(seasonsRes.error.message)
      if (badgesRes.error) throw new Error(badgesRes.error.message)

      const seasons: SeasonItem[] = seasonsRes.data as any
      const active = seasons.find((s) => s.is_active)

      let leaderboard: LeaderboardData | null = null
      if (active) {
        const lbRes = await apiClient.getSeasonLeaderboard(active.id, 100, false)
        if (!lbRes.error) {
          leaderboard = lbRes.data as any
        }
      }

      return {
        me: meRes.data,
        seasons,
        badges: (badgesRes.data as any[]) || [],
        activeSeasonId: active ? active.id : null,
        leaderboard,
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load stats')
    }
  }
)

export const loadAdminStats = createAsyncThunk<any, void>(
  'stats/loadAdmin',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.getAdminStats()
      if (res.error) throw new Error(res.error.message)
      return res.data
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load admin stats')
    }
  }
)

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    clearStats: (state) => {
      state.isLoading = false
      state.error = null
      state.me = null
      state.badges = []
      state.seasons = []
      state.activeSeasonId = null
      state.leaderboard = null
      state.admin = { ...initialState.admin }
    },
    setActiveSeasonId: (state, action: PayloadAction<string | null>) => {
      state.activeSeasonId = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAllStats.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loadAllStats.fulfilled, (state, action) => {
        state.isLoading = false
        state.error = null
        state.me = action.payload.me
        state.seasons = action.payload.seasons
        state.badges = action.payload.badges
        state.activeSeasonId = action.payload.activeSeasonId
        state.leaderboard = action.payload.leaderboard
      })
      .addCase(loadAllStats.rejected, (state, action) => {
        state.isLoading = false
        state.error = (action.payload as string) || 'Failed to load stats'
      })
      .addCase(loadAdminStats.pending, (state) => {
        state.admin.isLoading = true
        state.admin.error = null
      })
      .addCase(loadAdminStats.fulfilled, (state, action) => {
        state.admin.isLoading = false
        state.admin.error = null
        const d: any = action.payload
        state.admin.total_users = d.total_users
        state.admin.active_seasons = d.active_seasons
        state.admin.total_challenges = d.total_challenges
        state.admin.pending_challenges = d.pending_challenges
        state.admin.this_week_submissions = d.this_week_submissions
        state.admin.ai_generations_today = d.ai_generations_today
      })
      .addCase(loadAdminStats.rejected, (state, action) => {
        state.admin.isLoading = false
        state.admin.error = (action.payload as string) || 'Failed to load admin stats'
      })
  },
})

// Export the slice actions
export const { clearStats, setActiveSeasonId } = statsSlice.actions

// Export the reducer
export default statsSlice.reducer

