'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useMe, useSetupTotp, useEnableTotp, useDisableTotp } from '@/lib/api/hooks'
import { TwoFactorSettings } from '@/components/auth/TwoFactorSettings'
import { Settings, Shield, Key, User } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const { data: user } = useMe()
  const setupTotpMutation = useSetupTotp()
  const enableTotpMutation = useEnableTotp()
  const disableTotpMutation = useDisableTotp()
  
  const [totpSecret, setTotpSecret] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  const handleSetupTotp = async () => {
    const result = await setupTotpMutation.mutateAsync()
    if ((result as any)?.data) {
      setTotpSecret((result as any).data.secret)
      setQrCodeUrl((result as any).data.qr_code_url)
    }
  }

  const handleEnableTotp = async () => {
    if (totpCode && totpSecret) {
      await enableTotpMutation.mutateAsync({ totpCode, secret: totpSecret })
      setTotpSecret('')
      setTotpCode('')
      setQrCodeUrl('')
    }
  }

  const handleDisableTotp = async () => {
    if (totpCode) {
      await disableTotpMutation.mutateAsync({ totpCode })
      setTotpCode('')
    }
  }

  return (
    <div className="space-y-10 p-6">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20">
            <Settings className="h-10 w-10 text-primary" />
          </div>
          Settings
        </h1>
        <p className="text-lg text-muted-foreground ml-16">
          Manage your account settings and security preferences
        </p>
      </div>

      <div className="grid gap-8">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-secondary/20 via-secondary/15 to-secondary/10 border border-secondary/20">
                <User className="h-6 w-6 text-secondary" />
              </div>
              <span className="text-xl">Profile Information</span>
            </CardTitle>
            <CardDescription>
              Your basic account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="username" className="text-foreground font-semibold">Username</Label>
                <Input 
                  id="username" 
                  value={(user as any)?.username || ''} 
                  disabled 
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="email" className="text-foreground font-semibold">Email</Label>
                <Input 
                  id="email" 
                  value={(user as any)?.email || ''} 
                  disabled 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                <Label className="text-foreground font-semibold">Total Points</Label>
                <div className="text-3xl font-bold text-primary">
                  {(user as any)?.total_points || 0}
                </div>
              </div>
              <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent border border-secondary/20">
                <Label className="text-foreground font-semibold">Rank</Label>
                <div className="text-3xl font-bold text-secondary">
                  #{(user as any)?.rank || 'Unranked'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Two-Factor Authentication */}
        <TwoFactorSettings />

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-accent/20 via-accent/15 to-accent/10 border border-accent/20">
                <Key className="h-6 w-6 text-accent" />
              </div>
              <span className="text-xl">Change Password</span>
            </CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6">
              <div className="space-y-3">
                <Label htmlFor="current-password" className="text-foreground font-semibold">Current Password</Label>
                <Input id="current-password" type="password" placeholder="Enter your current password" />
              </div>
              <div className="space-y-3">
                <Label htmlFor="new-password" className="text-foreground font-semibold">New Password</Label>
                <Input id="new-password" type="password" placeholder="Enter your new password" />
              </div>
              <div className="space-y-3">
                <Label htmlFor="confirm-password" className="text-foreground font-semibold">Confirm New Password</Label>
                <Input id="confirm-password" type="password" placeholder="Confirm your new password" />
              </div>
              <Button size="lg" className="w-fit">Update Password</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
