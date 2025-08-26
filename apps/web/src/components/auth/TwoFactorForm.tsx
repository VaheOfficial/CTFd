'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Mail, Shield, Clock, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api/client'

interface TwoFactorFormProps {
  email: string
  onVerified: (code: string) => void
  onCancel: () => void
  purpose?: string
}

export function TwoFactorForm({ email, onVerified, onCancel, purpose = 'login' }: TwoFactorFormProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [canResend, setCanResend] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [timeLeft])

  // Auto-send code on mount only if not login purpose (login already sends it)
  useEffect(() => {
    if (purpose !== 'login') {
      sendCode()
    } else {
      // For login, the code was already sent by the backend
      setTimeLeft(300) // Start the timer
    }
  }, [])

  const sendCode = async () => {
    setIsSending(true)
    try {
      const response = await apiClient.send2FACode(email, purpose)
      if (response.error) {
        toast.error(response.error.message)
      } else {
        toast.success('Verification code sent to your email')
        setTimeLeft(300) // Reset timer
        setCanResend(false)
      }
    } catch (error) {
      toast.error('Failed to send verification code')
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }

    setIsLoading(true)
    try {
      const response = await apiClient.verify2FACode(email, code, purpose)
      if (response.error) {
        toast.error(response.error.message)
      } else {
        toast.success('Code verified successfully')
        onVerified(code)
      }
    } catch (error) {
      toast.error('Invalid or expired code')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code sent to your email
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Email Display */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <Mail className="h-5 w-5 text-emerald-400" />
          <span className="font-mono text-sm text-slate-300">{email}</span>
        </div>

        {/* Code Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-widest"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <Clock className="h-4 w-4" />
            <span>
              {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : 'Code expired'}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <Button 
              type="submit" 
              disabled={isLoading || code.length !== 6 || timeLeft === 0}
              className="w-full"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={sendCode}
                disabled={isSending || !canResend}
                className="flex-1"
              >
                {isSending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                {isSending ? 'Sending...' : 'Resend Code'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>

        {/* Help Text */}
        <div className="text-xs text-slate-500 text-center space-y-1">
          <p>Didn't receive the code? Check your spam folder.</p>
          <p>Code is valid for 5 minutes.</p>
        </div>
      </CardContent>
    </Card>
  )
}
