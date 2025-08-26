import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks'
import { fetchMe, login, signup, logout, setToken } from '@/lib/redux/slices/authSlice'

export function useAuth() {
  const dispatch = useAppDispatch()
  const { user, token, isLoading, isAuthenticated, error } = useAppSelector((state) => state.auth)

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
    login: (credentials: { username: string; password: string }) => dispatch(login(credentials)),
    signup: (credentials: { username: string; email: string; password: string }) => dispatch(signup(credentials)),
    logout: () => dispatch(logout()),
    fetchMe: () => dispatch(fetchMe()),
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
