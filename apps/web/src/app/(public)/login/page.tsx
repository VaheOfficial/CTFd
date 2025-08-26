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
import { Shield, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  totpCode: z.string().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, requiresTwoFactor, twoFactorEmail, clearTwoFactor } = useAuth()
  const [formData, setFormData] = useState<LoginForm>({
    username: '',
    password: '',
    totpCode: '',
  })
  const [errors, setErrors] = useState<Partial<LoginForm>>({})
  const [needsTotp, setNeedsTotp] = useState(false)
  const [userEmail, setUserEmail] = useState('')

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

    const result = await login({
      username: formData.username,
      password: formData.password,
      two_factor_code: formData.totpCode || undefined,
    })

    console.log('Login result:', result)
    console.log('Current Redux state after login:', { requiresTwoFactor, twoFactorEmail, isLoading })

    // If login is successful, redirect
    if (result.type === 'auth/login/fulfilled') {
      toast.success('Login successful!')
      router.push('/')
    } else if (result.type === 'auth/login/rejected') {
      // Check if it's a 2FA requirement
      const payload = result.payload as any
      console.log('Login rejected payload:', payload)
      if (payload?.requiresTwoFactor) {
        // 2FA is required - the Redux state will be updated automatically
        // The UI will show the 2FA form due to requiresTwoFactor state
        toast.info('Verification code sent to your email')
        console.log('2FA should be required now')
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
      const result = await login({
        username: formData.username,
        password: formData.password,
        two_factor_code: code,
      })

      if (result.type === 'auth/login/fulfilled') {
        toast.success('Login successful!')
        clearTwoFactor()
        router.push('/')
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification failed')
    }
  }

  const handle2FACancel = () => {
    clearTwoFactor()
    setFormData({ username: '', password: '', totpCode: '' })
  }

  console.log('Render check - 2FA state:', { requiresTwoFactor, twoFactorEmail })
  
  // Show 2FA form if required
  if (requiresTwoFactor && twoFactorEmail) {
    console.log('Rendering 2FA form for:', twoFactorEmail)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <TwoFactorForm
          email={twoFactorEmail}
          onVerified={handle2FAVerified}
          onCancel={handle2FACancel}
          purpose="login"
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/20">
            <Shield className="h-6 w-6 text-brand" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your CTE Platform account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
              <div className="space-y-2">
                <Label htmlFor="totpCode">Two-Factor Authentication Code</Label>
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
              className="w-full"
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

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/signup" className="text-brand hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}