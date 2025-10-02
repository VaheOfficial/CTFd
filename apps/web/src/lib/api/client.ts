import { paths } from './types'

export type ApiResponse<T> = {
  data?: T
  error?: {
    message: string
    status: number
    details?: any
    headers?: Record<string, string>
  }
}

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'
  headers?: Record<string, string>
  body?: any
  signal?: AbortSignal
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    // Initialize token from localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
  }

  setToken(token: string | null) {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token)
      } else {
        localStorage.removeItem('auth_token')
      }
    }
  }

  getToken(): string | null {
    return this.token
  }

  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { method = 'GET', headers = {}, body, signal } = options

    const url = `${this.baseUrl}${endpoint}`
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (this.token) {
      requestHeaders.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal,
      })

      // Handle 401 - redirect to login
      if (response.status === 401) {
        this.setToken(null)
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return {
          error: {
            message: 'Unauthorized',
            status: 401,
          },
        }
      }

      const contentType = response.headers.get('content-type')
      const isJson = contentType?.includes('application/json')

      let data: any
      if (isJson) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      if (!response.ok || response.status === 202) {
        // Special handling for 202 (2FA required) - include headers
        const headers = response.status === 202 ? Object.fromEntries(response.headers.entries()) : undefined
        
        return {
          error: {
            message: data?.detail || data?.message || `HTTP ${response.status}`,
            status: response.status,
            details: data,
            headers,
          },
        }
      }

      return { data }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          error: {
            message: 'Request aborted',
            status: 0,
          },
        }
      }

      return {
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          status: 0,
        },
      }
    }
  }

  // Authentication
  async login(credentials: {
    username: string
    password: string
    totp_code?: string
    two_factor_code?: string
  }) {
    type LoginResponse = paths['/api/auth/login']['post']['responses']['200']['content']['application/json']
    
    const response = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: credentials,
    })

    if (response.data?.access_token) {
      this.setToken(response.data.access_token)
    }

    return response
  }

  async signup(data: {
    username: string
    email: string
    password: string
  }) {
    type SignupResponse = paths['/api/auth/signup']['post']['responses']['200']['content']['application/json']
    
    const response = await this.request<SignupResponse>('/api/auth/signup', {
      method: 'POST',
      body: data,
    })

    if (response.data?.access_token) {
      this.setToken(response.data.access_token)
    }

    return response
  }

  async logout() {
    await this.request('/api/auth/logout', { method: 'POST' })
    this.setToken(null)
  }

  async getMe() {
    return this.request('/api/auth/me')
  }

  // TOTP
  async setupTotp() {
    type TOTPResponse = paths['/api/auth/totp/setup']['post']['responses']['200']['content']['application/json']
    return this.request<TOTPResponse>('/api/auth/totp/setup', { method: 'POST' })
  }

  async enableTotp(totpCode: string, secret: string) {
    return this.request('/api/auth/totp/enable', {
      method: 'POST',
      headers: {},
    })
  }

  async disableTotp(totpCode: string) {
    return this.request('/api/auth/totp/disable', {
      method: 'POST',
      headers: {},
    })
  }

  // Seasons
  async getSeasons() {
    type SeasonsResponse = paths['/api/seasons']['get']['responses']['200']['content']['application/json']
    return this.request<SeasonsResponse>('/api/seasons')
  }

  async getSeasonWeeks(seasonId: string) {
    type WeeksResponse = paths['/api/seasons/{season_id}/weeks']['get']['responses']['200']['content']['application/json']
    return this.request<WeeksResponse>(`/api/seasons/${seasonId}/weeks`)
  }

  async getSeasonChallenges(seasonId: string) {
    return this.request(`/api/seasons/${seasonId}/challenges`)
  }

  async getAvailableChallengesForSeason(seasonId: string) {
    return this.request(`/api/seasons/${seasonId}/available-challenges`)
  }

  async assignChallengeToWeek(weekId: string, challengeId: string, displayOrder: number = 0) {
    return this.request(`/api/weeks/${weekId}/challenges`, {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, display_order: displayOrder })
    })
  }

  async unassignChallengeFromWeek(weekId: string, challengeId: string) {
    return this.request(`/api/weeks/${weekId}/challenges/${challengeId}`, {
      method: 'DELETE'
    })
  }

  async getChallengeSeasons(challengeId: string) {
    return this.request(`/api/challenges/${challengeId}/seasons`)
  }

  async assignChallengeToSeason(challengeId: string, seasonId: string) {
    return this.request(`/api/challenges/${challengeId}/seasons/${seasonId}`, {
      method: 'POST'
    })
  }

  async unassignChallengeFromSeason(challengeId: string, seasonId: string) {
    return this.request(`/api/challenges/${challengeId}/seasons/${seasonId}`, {
      method: 'DELETE'
    })
  }

  // Challenges
  async getChallenges(params?: { track?: string; difficulty?: string; current_season_only?: boolean }) {
    const queryParams = new URLSearchParams()
    if (params?.track) queryParams.set('track', params.track)
    if (params?.difficulty) queryParams.set('difficulty', params.difficulty)
    if (params?.current_season_only) queryParams.set('current_season_only', 'false')
    
    const url = queryParams.toString() 
      ? `/api/challenges?${queryParams.toString()}`
      : '/api/challenges'
    
    return this.request(url)
  }

  async getChallengeById(challengeId: string) {
    type ChallengeResponse = paths['/api/challenges/{challenge_id}']['get']['responses']['200']['content']['application/json']
    return this.request<ChallengeResponse>(`/api/challenges/${challengeId}`)
  }

  async getChallengeBySlug(slug: string) {
    return this.request(`/api/challenges/slug/${slug}`)
  }

  async createChallengeInstance(challengeId: string) {
    type InstanceResponse = paths['/api/challenges/{challenge_id}/instance']['post']['responses']['200']['content']['application/json']
    return this.request<InstanceResponse>(`/api/challenges/${challengeId}/instance`, {
      method: 'POST',
    })
  }

  async submitFlag(challengeId: string, flag: string) {
    type SubmissionResponse = paths['/api/challenges/{challenge_id}/submit']['post']['responses']['200']['content']['application/json']
    return this.request<SubmissionResponse>(`/api/challenges/${challengeId}/submit`, {
      method: 'POST',
      body: { flag },
    })
  }

  async consumeHint(challengeId: string, hintOrder: number) {
    type HintResponse = paths['/api/challenges/{challenge_id}/hint/{hint_order}/consume']['post']['responses']['200']['content']['application/json']
    return this.request<HintResponse>(`/api/challenges/${challengeId}/hint/${hintOrder}/consume`, {
      method: 'POST',
    })
  }

  // Lab instances
  async getLabStatus(instanceId: string) {
    type LabStatusResponse = paths['/api/instances/{instance_id}/lab/status']['get']['responses']['200']['content']['application/json']
    return this.request<LabStatusResponse>(`/api/instances/${instanceId}/lab/status`)
  }

  async startLabInstance(instanceId: string) {
    return this.request(`/api/instances/${instanceId}/lab/start`, {
      method: 'POST',
    })
  }

  async stopLabInstance(instanceId: string) {
    return this.request(`/api/instances/${instanceId}/lab/stop`, {
      method: 'POST',
    })
  }

  // Artifacts
  async downloadArtifact(artifactId: string) {
    return this.request(`/api/artifacts/${artifactId}/download`)
  }

  // Leaderboard
  async getSeasonLeaderboard(seasonId: string, limit = 25, snapshot = false) {
    type LeaderboardResponse = paths['/api/leaderboard/season/{season_id}']['get']['responses']['200']['content']['application/json']
    const params = new URLSearchParams({
      limit: limit.toString(),
      snapshot: snapshot.toString(),
    })
    return this.request<LeaderboardResponse>(`/api/leaderboard/season/${seasonId}?${params}`)
  }

  async getBadges() {
    type BadgesResponse = paths['/api/badges/me']['get']['responses']['200']['content']['application/json']
    return this.request<BadgesResponse>('/api/badges/me')
  }

  // Admin
  async createChallenge(challengeYaml: any, seasonId?: string, weekIndex?: number) {
    return this.request('/api/admin/challenges', {
      method: 'POST',
      body: {
        challenge_yaml: challengeYaml,
        season_id: seasonId,
        week_index: weekIndex,
      },
    })
  }

  async getAdminChallenge(challengeId: string) {
    return this.request(`/api/admin/challenges/${challengeId}`)
  }

  async updateChallenge(challengeId: string, updates: any) {
    return this.request(`/api/admin/challenges/${challengeId}`, {
      method: 'PATCH',
      body: updates,
    })
  }

  async getAuditLogs(filters: {
    actor?: string
    entity_type?: string
    since?: string
    until?: string
    limit?: number
    cursor?: string
  } = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })
    
    type AuditResponse = paths['/api/admin/audit']['get']['responses']['200']['content']['application/json']
    return this.request<AuditResponse>(`/api/admin/audit?${params}`)
  }

  // AI Generation
  async generateChallenge(params: {
    prompt: string;
    preferred_provider?: 'gpt5' | 'claude' | 'auto';
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'INSANE';
    track?: 'INTEL_RECON' | 'ACCESS_EXPLOIT' | 'IDENTITY_CLOUD' | 'C2_EGRESS' | 'DETECT_FORENSICS';
    seed?: number;
    max_iterations?: number;
    client_stream_id?: string;
  }) {
    type GenerateResponse = paths['/api/admin/ai/generate']['post']['responses']['200']['content']['application/json'] & { stream_id: string }
    return this.request<GenerateResponse>('/api/admin/ai/generate', {
      method: 'POST',
      body: params,
    })
  }

  async materializeChallenge(challengeId: string) {
    return this.request(`/api/admin/ai/materialize/${challengeId}`, {
      method: 'POST',
      body: {},
    })
  }

  async publishChallenge(challengeId: string, seasonId?: string, weekIndex?: number) {
    return this.request(`/api/admin/ai/publish/${challengeId}`, {
      method: 'POST',
      body: {
        season_id: seasonId,
        week_index: weekIndex,
      },
    })
  }

  // Admin AI user reply (multipart form)
  async replyToAIRequest(params: {
    stream_id: string
    request_id: string
    accepted: boolean
    reason?: string
    text?: string
    file?: File | null
  }) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const url = `${baseUrl}/api/admin/ai/reply`
    const form = new FormData()
    form.append('stream_id', params.stream_id)
    form.append('request_id', params.request_id)
    form.append('accepted', String(params.accepted))
    if (params.reason) form.append('reason', params.reason)
    if (params.text) form.append('text', params.text)
    if (params.file) form.append('file', params.file)

    const headers: Record<string, string> = {}
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    try {
      const res = await fetch(url, { method: 'POST', headers, body: form })
      const isJson = res.headers.get('content-type')?.includes('application/json')
      const data = isJson ? await res.json() : await res.text()
      if (!res.ok) {
        return { error: { message: (data as any)?.detail || `HTTP ${res.status}`, status: res.status, details: data } }
      }
      return { data }
    } catch (e: any) {
      return { error: { message: e?.message || 'Network error', status: 0 } }
    }
  }

  // Admin Stats
  async getAdminStats() {
    return this.request('/api/admin/stats')
  }

  // Admin Analytics
  async getAdminAnalyticsOverview() {
    return this.request('/api/admin/analytics/overview')
  }

  async getAdminAnalyticsUsage() {
    return this.request('/api/admin/analytics/usage')
  }

  async getAdminAnalyticsHealth() {
    return this.request('/api/admin/analytics/health')
  }

  async createSeason(season: any) {
    return this.request('/api/seasons', {
      method: 'POST',
      body: season,
    })
  }

  async getSeason(seasonId: string) {
    return this.request(`/api/seasons/${seasonId}`)
  }

  async updateSeason(seasonId: string, updates: any) {
    return this.request(`/api/seasons/${seasonId}`, {
      method: 'PATCH',
      body: updates,
    })
  }

  // Two-Factor Authentication
  async send2FACode(username: string, purpose: string = 'login') {
    return this.request('/api/auth/2fa/send-code', {
      method: 'POST',
      body: { username, purpose }
    })
  }

  async verify2FACode(username: string, code: string, purpose: string = 'login') {
    return this.request('/api/auth/2fa/verify-code', {
      method: 'POST', 
      body: { username, code, purpose }
    })
  }

  async get2FAStatus() {
    return this.request('/api/auth/2fa/status')
  }

  async toggle2FA(enable: boolean) {
    return this.request('/api/auth/2fa/enable', {
      method: 'POST',
      body: { enable }
    })
  }

  // User Management (Admin)
  async getUsers(filters: {
    search?: string
    role?: string
    status?: string
    limit?: number
    offset?: number
  } = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })
    
    return this.request(`/api/admin/users?${params}`)
  }

  async updateUser(userId: string, updates: {
    role?: string
    is_active?: boolean
  }) {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: updates,
    })
  }

  // Notifications
  async getNotifications() {
    return this.request('/api/notifications')
  }

  async createNotification(notification: {
    title: string
    message: string
    user_id?: number
    is_global: boolean
  }) {
    return this.request('/api/notifications', {
      method: 'POST',
      body: notification,
    })
  }

  async markNotificationAsRead(notificationId: number) {
    return this.request(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    })
  }

  async markAllNotificationsAsRead() {
    return this.request('/api/notifications/read-all', {
      method: 'PUT',
    })
  }

  async retryValidation(challengeId: string, validationType: 'initial' | 'post_materialization') {
    return this.request(`/api/admin/ai/retry-validation/${challengeId}`, {
      method: 'POST',
      body: { validation_type: validationType },
    })
  }
}

export const apiClient = new ApiClient()
