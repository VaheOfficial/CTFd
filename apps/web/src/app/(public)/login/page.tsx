'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/hooks'
import { TwoFactorForm } from '@/components/auth/TwoFactorForm'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Shield, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAppDispatch } from '@/lib/redux/hooks'
import { setToken, setUser, clearTwoFactor } from '@/lib/redux/slices/authSlice'
import { apiClient } from '@/lib/api/client'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  totpCode: z.string().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuth()
  const dispatch = useAppDispatch()
  const [formData, setFormData] = useState<LoginForm>({
    username: '',
    password: '',
    totpCode: '',
  })
  const [errors, setErrors] = useState<Partial<LoginForm>>({})
  const [needsTotp, setNeedsTotp] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [username, setUsername] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    try {
      loginSchema.parse(formData)
      setErrors({})
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<LoginForm> = {}
        error.errors.forEach((err) => {
          const field = err.path[0] as keyof LoginForm
          fieldErrors[field] = err.message
        })
        setErrors(fieldErrors)
        return
      }
    }

    // First, try login without 2FA code
    const result = await login({
      username: formData.username,
      password: formData.password,
      two_factor_code: undefined, // Always try without 2FA first
    })

    // If login is successful (no 2FA required), redirect
    if (result.type === 'auth/login/fulfilled') {
      toast.success('Login successful!')
      router.push('/')
    } else if (result.type === 'auth/login/rejected') {
      const payload = result.payload as any
      
      if (payload?.requiresTwoFactor) {
        // 2FA is required - show 2FA popup
        setUsername(payload?.username || formData.username) // Use username from payload
        setShow2FA(true)
        toast.info('Please enter your verification code')
      } else {
        // Handle other types of errors
        const errorMessage = payload?.message || 'Login failed'
        toast.error(errorMessage)
      }
    }
  }

  const handleInputChange = (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handle2FAVerified = async (code: string) => {
    try {
      // The 2FA verification now completes the login process
      const response = await apiClient.verify2FACode(username, code, 'login')
      
      if (response.error) {
        toast.error(response.error.message)
        return
      }
      
      // 2FA verification returned a login token - update Redux state
      if (response.data && typeof response.data === 'object' && 'access_token' in response.data) {
        const loginData = response.data as any // Type assertion for the login response
        
        // Set the token and user data
        dispatch(setToken(loginData.access_token))
        dispatch(setUser(loginData.user))
        dispatch(clearTwoFactor())
        
        // Immediately update API client with the new token
        apiClient.setToken(loginData.access_token)
        
        toast.success('Login successful!')
        setShow2FA(false)
        router.push('/')
      } else {
        toast.error('Login failed - no token received')
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification failed')
    }
  }

  const handle2FACancel = () => {
    setShow2FA(false)
    setFormData({ username: '', password: '', totpCode: '' })
  }

  // Show 2FA form if needed
  if (show2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <TwoFactorForm
          username={username}
          onVerified={handle2FAVerified}
          onCancel={handle2FACancel}
          purpose="login"
        />
      </div>
    )
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background/95 to-card/20 p-4">
        <Card className="w-full max-w-lg shadow-2xl">
          <CardHeader className="space-y-6 text-center pb-8">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20 shadow-lg">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-3">
              <CardTitle className="text-3xl font-bold text-foreground">Welcome back</CardTitle>
              <CardDescription className="text-lg">
                Sign in to your Defensive Cyberspace Operations Platform
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="username" className="text-foreground font-semibold">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleInputChange('username')}
                  className={errors.username ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-foreground font-semibold">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  className={errors.password ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {needsTotp && (
                <div className="space-y-3">
                  <Label htmlFor="totpCode" className="text-foreground font-semibold">Two-Factor Authentication Code</Label>
                  <Input
                    id="totpCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={formData.totpCode}
                    onChange={handleInputChange('totpCode')}
                    className={errors.totpCode ? 'border-red-500' : ''}
                    disabled={isLoading}
                    maxLength={6}
                  />
                  {errors.totpCode && (
                    <p className="text-sm text-red-500">{errors.totpCode}</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full mt-8"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <span className="text-muted-foreground text-base">Don't have an account? </span>
              <Link href="/signup" className="text-primary hover:text-primary/80 font-semibold text-base hover:underline transition-colors">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}