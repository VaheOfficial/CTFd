'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useMe, useSetupTotp, useEnableTotp, useDisableTotp } from '@/lib/api/hooks'
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8 text-brand" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and security preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-brand" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your basic account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={(user as any)?.username || ''} 
                  disabled 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  value={(user as any)?.email || ''} 
                  disabled 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Points</Label>
                <div className="text-2xl font-bold text-brand">
                  {(user as any)?.total_points || 0}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rank</Label>
                <div className="text-2xl font-bold">
                  #{(user as any)?.rank || 'Unranked'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">TOTP Status</p>
                <p className="text-sm text-muted-foreground">
                  Time-based one-time passwords using an authenticator app
                </p>
              </div>
              <Badge variant={(user as any)?.totp_enabled ? "default" : "outline"}>
                {(user as any)?.totp_enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>

            {!(user as any)?.totp_enabled ? (
              <div className="space-y-4">
                {!totpSecret ? (
                  <Button onClick={handleSetupTotp} disabled={setupTotpMutation.isPending}>
                    Setup Two-Factor Authentication
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <p className="text-sm font-medium mb-2">Scan this QR code with your authenticator app:</p>
                      {qrCodeUrl && (
                        <img src={qrCodeUrl} alt="TOTP QR Code" className="mx-auto" />
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Or enter this secret manually: <code className="bg-slate-700 px-1 rounded">{totpSecret}</code>
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter 6-digit code from app"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        maxLength={6}
                      />
                      <Button 
                        onClick={handleEnableTotp}
                        disabled={!totpCode || enableTotpMutation.isPending}
                      >
                        Enable
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter 6-digit code to disable"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    maxLength={6}
                  />
                  <Button 
                    variant="destructive"
                    onClick={handleDisableTotp}
                    disabled={!totpCode || disableTotpMutation.isPending}
                  >
                    Disable TOTP
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-brand" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" />
            </div>
            <Button>Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
