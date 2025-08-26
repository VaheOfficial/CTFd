'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Shield, Mail, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api/client'
import { useToggle2FA } from '@/lib/auth/hooks'

interface TwoFactorStatus {
  email_2fa_enabled: boolean
  backup_email?: string
  rate_limited: boolean
  rate_limit_expires?: string
}

export function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const toggle2FA = useToggle2FA()

  const fetchStatus = async () => {
    try {
      const response = await apiClient.get2FAStatus()
      if (response.error) {
        toast.error('Failed to load 2FA status')
      } else {
        setStatus(response.data as TwoFactorStatus)
      }
    } catch (error) {
      toast.error('Failed to load 2FA status')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleToggle = async (enabled: boolean) => {
    try {
      await toggle2FA.mutateAsync(enabled)
      toast.success(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`)
      // Refresh status
      await fetchStatus()
    } catch (error) {
      toast.error('Failed to update 2FA settings')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Loading 2FA settings...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-10 bg-slate-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-400" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Secure your account with email-based two-factor authentication
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              status?.email_2fa_enabled 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-slate-600/20 text-slate-400'
            }`}>
              {status?.email_2fa_enabled ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-white">
                Email 2FA {status?.email_2fa_enabled ? 'Enabled' : 'Disabled'}
              </h3>
              <p className="text-sm text-slate-400">
                {status?.email_2fa_enabled 
                  ? 'Your account is protected with email verification'
                  : 'Enable for additional security'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={status?.email_2fa_enabled || false}
              onCheckedChange={handleToggle}
              disabled={toggle2FA.isPending || status?.rate_limited}
            />
          </div>
        </div>

        {/* Rate Limiting Warning */}
        {status?.rate_limited && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div>
              <h4 className="font-medium text-yellow-300">Rate Limited</h4>
              <p className="text-sm text-yellow-400">
                Too many failed attempts. Please try again later.
              </p>
            </div>
          </div>
        )}

        {/* How it Works */}
        <div className="space-y-4">
          <h4 className="font-medium text-white">How Email 2FA Works</h4>
          <div className="space-y-3 text-sm text-slate-400">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold mt-0.5">
                1
              </div>
              <p>You sign in with your username and password</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold mt-0.5">
                2
              </div>
              <p>We send a 6-digit verification code to your email</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold mt-0.5">
                3
              </div>
              <p>Enter the code to complete sign-in (expires in 5 minutes)</p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-blue-300">Security Notice</h4>
              <p className="text-sm text-slate-400">
                Two-factor authentication significantly increases your account security. 
                We recommend enabling it to protect against unauthorized access.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
