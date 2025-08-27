'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useSignup } from '@/lib/api/hooks'
import { Shield, Loader2, CheckCircle } from 'lucide-react'
import { z } from 'zod'

const signupSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupForm = z.infer<typeof signupSchema>

const passwordRequirements = [
  { label: 'At least 8 characters', check: (pw: string) => pw.length >= 8 },
  { label: 'One lowercase letter', check: (pw: string) => /[a-z]/.test(pw) },
  { label: 'One uppercase letter', check: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'One number', check: (pw: string) => /\d/.test(pw) },
]

export default function SignupPage() {
  const router = useRouter()
  const signupMutation = useSignup()
  const [formData, setFormData] = useState<SignupForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Partial<SignupForm>>({})
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    try {
      signupSchema.parse(formData)
      setErrors({})
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<SignupForm> = {}
        error.errors.forEach((err) => {
          const field = err.path[0] as keyof SignupForm
          fieldErrors[field] = err.message
        })
        setErrors(fieldErrors)
        return
      }
    }

    try {
      const result = await signupMutation.mutateAsync({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      })

      if ((result as any)?.data) {
        router.push('/')
      }
    } catch (error) {
      // Error is already handled by the mutation
    }
  }

  const handleInputChange = (field: keyof SignupForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background/95 to-card/20 p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="space-y-6 text-center pb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20 shadow-lg">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-3">
            <CardTitle className="text-3xl font-bold text-foreground">Create your account</CardTitle>
            <CardDescription className="text-lg">
              Join the Defensive Cyberspace Operations Platform
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
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleInputChange('username')}
                className={errors.username ? 'border-red-500' : ''}
                disabled={signupMutation.isPending}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-foreground font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange('email')}
                className={errors.email ? 'border-red-500' : ''}
                disabled={signupMutation.isPending}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-foreground font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleInputChange('password')}
                onFocus={() => setShowPasswordRequirements(true)}
                onBlur={() => setShowPasswordRequirements(false)}
                className={errors.password ? 'border-red-500' : ''}
                disabled={signupMutation.isPending}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
              
              {showPasswordRequirements && (
                <div className="space-y-3 p-4 rounded-xl bg-card/50 border border-border backdrop-blur-sm">
                  <p className="text-base font-semibold text-foreground">Password requirements:</p>
                  <div className="space-y-2">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-3 text-base">
                        {req.check(formData.password) ? (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/50" />
                        )}
                        <span className={req.check(formData.password) ? 'text-primary font-medium' : 'text-muted-foreground'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="confirmPassword" className="text-foreground font-semibold">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                className={errors.confirmPassword ? 'border-red-500' : ''}
                disabled={signupMutation.isPending}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-8"
              size="lg"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            {signupMutation.error && (
              <div className="text-sm text-red-500 text-center">
                {signupMutation.error.message || 'Signup failed. Please try again.'}
              </div>
            )}
          </form>

          <div className="mt-8 text-center">
            <span className="text-muted-foreground text-base">Already have an account? </span>
            <Link href="/login" className="text-primary hover:text-primary/80 font-semibold text-base hover:underline transition-colors">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}