import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { toast } from 'sonner'

// Query Keys
export const queryKeys = {
  auth: ['auth'] as const,
  me: () => [...queryKeys.auth, 'me'] as const,
  seasons: () => ['seasons'] as const,
  season: (id: string) => [...queryKeys.seasons(), id] as const,
  seasonWeeks: (seasonId: string) => [...queryKeys.season(seasonId), 'weeks'] as const,
  challenges: () => ['challenges'] as const,
  challenge: (id: string) => [...queryKeys.challenges(), id] as const,
  challengeInstance: (challengeId: string) => [...queryKeys.challenge(challengeId), 'instance'] as const,
  labStatus: (instanceId: string) => ['lab', instanceId, 'status'] as const,
  leaderboard: (seasonId: string) => ['leaderboard', seasonId] as const,
  badges: () => ['badges'] as const,
  myBadges: () => [...queryKeys.badges(), 'me'] as const,
  auditLogs: (filters: Record<string, any>) => ['audit', filters] as const,
}

// Auth Hooks
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: async () => {
      const response = await apiClient.getMe()
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: apiClient.login.bind(apiClient),
    onSuccess: (response: any) => {
      if (response.data) {
        // Invalidate and refetch user data
        queryClient.invalidateQueries({ queryKey: queryKeys.auth })
        toast.success('Logged in successfully')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Login failed')
    },
  })
}

export function useSignup() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: apiClient.signup.bind(apiClient),
    onSuccess: (response: any) => {
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: queryKeys.auth })
        toast.success('Account created successfully')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Signup failed')
    },
  })
}



// Challenge Hooks
export function useChallenge(challengeId: string) {
  return useQuery({
    queryKey: queryKeys.challenge(challengeId),
    queryFn: async () => {
      const response = await apiClient.getChallenge(challengeId)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    enabled: !!challengeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useChallengeInstance(challengeId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => apiClient.createChallengeInstance(challengeId),
    onSuccess: (response) => {
      if (response.data) {
        queryClient.setQueryData(queryKeys.challengeInstance(challengeId), response.data)
        toast.success('Challenge instance created')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create challenge instance')
    },
  })
}

export function useSubmitFlag(challengeId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ flag }: { flag: string }) =>
      apiClient.submitFlag(challengeId, flag),
    onSuccess: (response) => {
      if (response.data?.correct) {
        toast.success(
          response.data.is_first_blood 
            ? '🩸 First Blood! Challenge solved!' 
            : '✅ Challenge solved!',
          {
            description: `+${response.data.points_awarded} points`,
          }
        )
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.challenge(challengeId) })
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
        queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      } else {
        toast.error('❌ Incorrect flag', {
          description: response.data?.message || 'Try again!',
        })
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit flag')
    },
  })
}

export function useConsumeHint(challengeId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ hintOrder }: { hintOrder: number }) =>
      apiClient.consumeHint(challengeId, hintOrder),
    onSuccess: (response) => {
      if (response.data) {
        toast.info('💡 Hint consumed', {
          description: `-${response.data.points_deducted} points`,
        })
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.challenge(challengeId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to consume hint')
    },
  })
}

// Lab Hooks
export function useLabStatus(instanceId: string) {
  return useQuery({
    queryKey: queryKeys.labStatus(instanceId),
    queryFn: async () => {
      const response = await apiClient.getLabStatus(instanceId)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    enabled: !!instanceId,
    refetchInterval: (query) => {
      // Poll more frequently if lab is starting up
      return query.state.data?.status === 'STARTING' ? 2000 : 10000
    },
    staleTime: 5000, // 5 seconds
  })
}

export function useStartLabInstance() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ instanceId }: { instanceId: string }) =>
      apiClient.startLabInstance(instanceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labStatus(variables.instanceId) })
      toast.success('Lab instance starting...')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start lab instance')
    },
  })
}

export function useStopLabInstance() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ instanceId }: { instanceId: string }) =>
      apiClient.stopLabInstance(instanceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labStatus(variables.instanceId) })
      toast.success('Lab instance stopped')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to stop lab instance')
    },
  })
}

// Artifact Hooks
export function useDownloadArtifact() {
  return useMutation({
    mutationFn: ({ artifactId }: { artifactId: string }) =>
      apiClient.downloadArtifact(artifactId),
    onError: (error: any) => {
      toast.error(error.message || 'Failed to download artifact')
    },
  })
}

// Leaderboard Hooks
export function useLeaderboard(seasonId: string, limit = 25, snapshot = false) {
  return useQuery({
    queryKey: queryKeys.leaderboard(seasonId),
    queryFn: async () => {
      const response = await apiClient.getSeasonLeaderboard(seasonId, limit, snapshot)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    enabled: !!seasonId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useBadges() {
  return useQuery({
    queryKey: queryKeys.myBadges(),
    queryFn: async () => {
      const response = await apiClient.getBadges()
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Admin Hooks
export function useCreateChallenge() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ challengeYaml, seasonId, weekIndex }: {
      challengeYaml: any
      seasonId?: string
      weekIndex?: number
    }) => apiClient.createChallenge(challengeYaml, seasonId, weekIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges() })
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons() })
      toast.success('Challenge created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create challenge')
    },
  })
}

export function useUpdateChallenge() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ challengeId, updates }: {
      challengeId: string
      updates: any
    }) => apiClient.updateChallenge(challengeId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenge(variables.challengeId) })
      toast.success('Challenge updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update challenge')
    },
  })
}

export function useAuditLogs(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs(filters),
    queryFn: async () => {
      const response = await apiClient.getAuditLogs(filters)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

// TOTP hooks
export function useSetupTotp() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/totp/setup', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to setup TOTP')
      return response.json()
    },
    onSuccess: () => {
      toast.success('TOTP setup initiated')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to setup TOTP')
    }
  })
}

export function useEnableTotp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ totpCode, secret }: { totpCode: string; secret: string }) => {
      const response = await fetch('/api/auth/totp/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totp_code: totpCode, secret })
      })
      if (!response.ok) throw new Error('Failed to enable TOTP')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      toast.success('TOTP enabled successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to enable TOTP')
    }
  })
}

export function useDisableTotp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ totpCode }: { totpCode: string }) => {
      const response = await fetch('/api/auth/totp/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totp_code: totpCode })
      })
      if (!response.ok) throw new Error('Failed to disable TOTP')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      toast.success('TOTP disabled successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to disable TOTP')
    }
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
    },
    onSuccess: () => {
      apiClient.setToken(null)
      queryClient.clear()
      window.location.href = '/login'
    },
    onError: () => {
      // Force logout even on error
      apiClient.setToken(null)
      queryClient.clear()
      window.location.href = '/login'
    }
  })
}

// AI Generation Hooks
export function useGenerateChallenge() {
  return useMutation({
    mutationFn: ({ prompt }: { prompt: string }) =>
      apiClient.generateChallenge(prompt),
    onSuccess: () => {
      toast.success('Challenge generated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate challenge')
    },
  })
}

export function useMaterializeChallenge() {
  return useMutation({
    mutationFn: ({ challengeId }: { challengeId: string }) =>
      apiClient.materializeChallenge(challengeId),
    onSuccess: () => {
      toast.success('Challenge artifacts materialized')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to materialize challenge')
    },
  })
}

export function usePublishChallenge() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ challengeId, seasonId, weekIndex }: {
      challengeId: string
      seasonId?: string
      weekIndex?: number
    }) => apiClient.publishChallenge(challengeId, seasonId, weekIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges() })
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons() })
      toast.success('Challenge published successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to publish challenge')
    },
  })
}

// Season Hooks
export function useSeasons() {
  return useQuery({
    queryKey: queryKeys.seasons(),
    queryFn: async () => {
      const response = await apiClient.getSeasons()
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useCreateSeason() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (seasonData: any) => {
      const response = await apiClient.createSeason(seasonData)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons() })
      toast.success('Season created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create season')
    },
  })
}

export function useSeasonWeeks(seasonId: string) {
  return useQuery({
    queryKey: queryKeys.seasonWeeks(seasonId),
    queryFn: async () => {
      const response = await apiClient.getSeasonWeeks(seasonId)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    enabled: !!seasonId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}
