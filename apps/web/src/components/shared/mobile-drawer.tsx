'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, 
  X, 
  Trophy, 
  Target, 
  Users, 
  Medal, 
  Settings, 
  LogOut,
  Home,
  Bell
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMe, useLogout } from '@/lib/api/hooks'
import { cn } from '@/lib/utils'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname()
  const { data: user } = useMe()
  const logoutMutation = useLogout()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Seasons', href: '/seasons', icon: Trophy },
    { name: 'Challenges', href: '/challenges', icon: Target },
    { name: 'Leaderboard', href: '/leaderboard', icon: Users },
    { name: 'Badges', href: '/badges', icon: Medal },
  ]

  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: Settings },
    { name: 'AI Generator', href: '/admin/ai', icon: Target },
  ]

  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'moderator'
  const currentNav = pathname?.startsWith('/admin') ? adminNavigation : navigation

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        "fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-card via-card/98 to-card/95 border-r-2 border-border backdrop-blur-md shadow-2xl z-50 md:hidden transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary via-primary/95 to-primary/90 flex items-center justify-center shadow-lg">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">DCO Platform</span>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-secondary/20 via-secondary/15 to-secondary/10 border border-secondary/30 flex items-center justify-center shadow-lg">
                  <span className="text-lg font-bold text-secondary">
                    {(user as any)?.username?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-lg">{(user as any)?.username}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="primary">
                      {formatPoints((user as any)?.total_points || 0)}
                    </Badge>
                    <Badge variant="secondary">
                      Rank #{(user as any)?.rank || 'N/A'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-6 space-y-3">
              {currentNav.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname?.startsWith(item.href))
                const IconComponent = item.icon
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 min-h-[48px]',
                      isActive
                        ? 'bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground shadow-lg'
                        : 'text-muted-foreground hover:bg-card/80 hover:text-foreground'
                    )}
                  >
                    <IconComponent className="h-6 w-6" />
                    {item.name}
                  </Link>
                )
              }) as React.ReactNode}
              
              {/* Admin Toggle */}
              {isAdmin && (
                <div className="pt-4 mt-4 border-t border-border">
                  <div className="flex gap-3">
                    <Link href="/" onClick={onClose} className="flex-1">
                      <Button variant={!pathname?.startsWith('/admin') ? 'default' : 'outline'} size="lg" className="w-full">
                        User
                      </Button>
                    </Link>
                    <Link href="/admin" onClick={onClose} className="flex-1">
                      <Button variant={pathname?.startsWith('/admin') ? 'default' : 'outline'} size="lg" className="w-full">
                        Admin
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border space-y-3">
            <Button variant="ghost" size="lg" className="w-full justify-start">
              <Bell className="h-5 w-5 mr-4" />
              <span className="flex-1 text-left">Notifications</span>
              <div className="h-2 w-2 rounded-full bg-accent" />
            </Button>
            <Link href="/settings" onClick={onClose}>
              <Button variant="ghost" size="lg" className="w-full justify-start">
                <Settings className="h-5 w-5 mr-4" />
                Settings
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="lg"
              className="w-full justify-start text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              onClick={() => {
                logoutMutation.mutate()
                onClose()
              }}
            >
              <LogOut className="h-5 w-5 mr-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function formatPoints(points: number) {
  if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`
  if (points >= 1000) return `${(points / 1000).toFixed(1)}K`
  return points.toString()
}
