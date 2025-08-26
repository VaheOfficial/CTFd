import { useEffect, useState } from 'react'
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks'
import { fetchMe, login, signup, logout, setToken, setTwoFactorRequired, clearTwoFactor } from '@/lib/redux/slices/authSlice'
import { apiClient } from '@/lib/api/client'

export function useAuth() {
  const dispatch = useAppDispatch()
  const { user, token, isLoading, isAuthenticated, error, requiresTwoFactor, twoFactorEmail } = useAppSelector((state) => state.auth)

  // Initialize auth on mount if token exists in localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token')
    if (storedToken && !token) {
      dispatch(setToken(storedToken))
      dispatch(fetchMe())
    } else if (token && !user) {
      dispatch(fetchMe())
    }
  }, [dispatch, token, user])

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    error,
    requiresTwoFactor,
    twoFactorEmail,
    login: (credentials: { username: string; password: string; two_factor_code?: string }) => dispatch(login(credentials)),
    signup: (credentials: { username: string; email: string; password: string }) => dispatch(signup(credentials)),
    logout: () => dispatch(logout()),
    fetchMe: () => dispatch(fetchMe()),
    setTwoFactorRequired: (email: string) => dispatch(setTwoFactorRequired({ email })),
    clearTwoFactor: () => dispatch(clearTwoFactor()),
  }
}

// Backward compatibility hook to replace useMe
export function useMe() {
  const { user, isLoading, error } = useAuth()
  
  return {
    data: user,
    isLoading,
    error: error ? new Error(error) : null,
  }
}

export function useLogin() {
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector((state) => state.auth)

  return {
    mutate: (credentials: { username: string; password: string }) => 
      dispatch(login(credentials)),
    mutateAsync: async (credentials: { username: string; password: string }) => {
      const result = await dispatch(login(credentials))
      if (login.rejected.match(result)) {
        throw new Error(result.payload as string)
      }
      return result.payload
    },
    isPending: isLoading,
    isError: !!error,
    error: error ? new Error(error) : null,
  }
}

export function useSignup() {
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector((state) => state.auth)

  return {
    mutate: (credentials: { username: string; email: string; password: string }) => 
      dispatch(signup(credentials)),
    mutateAsync: async (credentials: { username: string; email: string; password: string }) => {
      const result = await dispatch(signup(credentials))
      if (signup.rejected.match(result)) {
        throw new Error(result.payload as string)
      }
      return result.payload
    },
    isPending: isLoading,
    isError: !!error,
    error: error ? new Error(error) : null,
  }
}

export function useLogout() {
  const dispatch = useAppDispatch()

  return {
    mutate: () => dispatch(logout()),
    mutateAsync: async () => {
      dispatch(logout())
    },
    isPending: false,
    isError: false,
    error: null,
  }
}

// 2FA Hooks
export function useSend2FACode() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutateAsync = async ({ email, purpose = 'login' }: { email: string; purpose?: string }) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.send2FACode(email, purpose)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    mutateAsync,
    isPending: isLoading,
    error: error ? new Error(error) : null,
  }
}

export function useVerify2FACode() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutateAsync = async ({ email, code, purpose = 'login' }: { 
    email: string; 
    code: string; 
    purpose?: string 
  }) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.verify2FACode(email, code, purpose)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    mutateAsync,
    isPending: isLoading,
    error: error ? new Error(error) : null,
  }
}

export function useToggle2FA() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutateAsync = async (enable: boolean) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.toggle2FA(enable)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    mutateAsync,
    isPending: isLoading,
    error: error ? new Error(error) : null,
  }
}
