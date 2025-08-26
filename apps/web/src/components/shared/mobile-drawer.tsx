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
  Home
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
        "fixed left-0 top-0 h-full w-80 bg-slate-900 border-r border-slate-700 z-50 md:hidden transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">CTE Platform</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-brand">
                    {(user as any)?.username?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{(user as any)?.username}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {formatPoints((user as any)?.total_points || 0)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Rank #{(user as any)?.rank || 'N/A'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-4 space-y-2">
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
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
              
              {/* Admin Toggle */}
              {isAdmin && (
                <div className="pt-2 mt-2 border-t border-slate-700">
                  <div className="flex gap-2">
                    <Link href="/" onClick={onClose}>
                      <Button variant={!pathname?.startsWith('/admin') ? 'default' : 'outline'} size="sm" className="flex-1">
                        User
                      </Button>
                    </Link>
                    <Link href="/admin" onClick={onClose}>
                      <Button variant={pathname?.startsWith('/admin') ? 'default' : 'outline'} size="sm" className="flex-1">
                        Admin
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700 space-y-2">
            <Link href="/settings" onClick={onClose}>
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-3" />
                Settings
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => {
                logoutMutation.mutate()
                onClose()
              }}
            >
              <LogOut className="h-4 w-4 mr-3" />
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
