'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/hooks'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { isAuthenticated, isLoading, requiresTwoFactor } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Don't redirect while still loading or during 2FA flow
    if (isLoading || requiresTwoFactor) return

    if (requireAuth && !isAuthenticated) {
      // User needs to be authenticated but isn't - redirect to login
      router.push('/login')
    } else if (!requireAuth && isAuthenticated) {
      // User is authenticated but on a public page - redirect to dashboard
      router.push('/')
    }
  }, [isAuthenticated, isLoading, requireAuth, requiresTwoFactor, router])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // For protected routes, don't render until authenticated (unless in 2FA flow)
  if (requireAuth && !isAuthenticated && !requiresTwoFactor) {
    return null // Will redirect to login
  }

  // For public routes, don't render if authenticated (will redirect to dashboard)
  if (!requireAuth && isAuthenticated) {
    return null
  }

  return <>{children}</>
}
