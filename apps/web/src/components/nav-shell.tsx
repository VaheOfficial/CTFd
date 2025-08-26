'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MobileDrawer } from '@/components/shared/mobile-drawer'
import { 
  Shield, 
  Trophy, 
  Users, 
  Medal, 
  Settings, 
  LogOut,
  Menu,
  Zap,
  Home,
  Target,
  ChevronDown,
  Bell,
  Search,
  User,
  Crown
} from 'lucide-react'
import { useState } from 'react'
import { useMe, useLogout } from '@/lib/api/hooks'
import { cn, formatPoints } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Seasons', href: '/seasons', icon: Trophy },
  { name: 'Challenges', href: '/challenges', icon: Target },
  { name: 'Leaderboard', href: '/leaderboard', icon: Users },
  { name: 'Badges', href: '/badges', icon: Medal },
]

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: Shield },
  { name: 'Seasons', href: '/admin/seasons', icon: Trophy },
  { name: 'Challenges', href: '/admin/challenges', icon: Zap },
  { name: 'AI Generator', href: '/admin/ai', icon: Zap },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Audit', href: '/admin/audit', icon: Settings },
]

export function NavShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const { data: user } = useMe()
  const logoutMutation = useLogout()
  
  const isAdmin = (user as any)?.role === 'ADMIN' || (user as any)?.role === 'AUTHOR' || (user as any)?.role === 'REVIEWER'
  const isAdminPage = pathname?.startsWith('/admin')
  const currentNav = isAdminPage ? adminNavigation : navigation

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Left Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50 shadow-xl shadow-black/20 hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo Header */}
          <div className="flex items-center px-6 py-5 border-b border-slate-800/50">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all duration-300">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-lime-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  CTF Platform
                </h1>
                <p className="text-sm text-slate-400">Cyber Training Excellence</p>
              </div>
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {currentNav.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname?.startsWith(item.href))
              const IconComponent = item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 shadow-sm border border-emerald-500/20 shadow-emerald-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 hover:border-slate-700/50 border border-transparent'
                  )}
                >
                  <IconComponent className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
                  )} />
                  <span>{item.name}</span>
                </Link>
              )
            }) as React.ReactNode}
          </nav>

          {/* Admin/User Mode Toggle */}
          {isAdmin && (
            <div className="px-4 py-4 border-t border-slate-800/50">
              <div className="flex rounded-xl bg-slate-800/60 border border-slate-700/50 p-1">
                <Link href="/" className="flex-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full h-10 rounded-lg text-sm font-medium transition-all",
                      !isAdminPage 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm" 
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    )}
                  >
                    <User className="h-4 w-4 mr-2" />
                    User Mode
                  </Button>
                </Link>
                <Link href="/admin" className="flex-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full h-10 rounded-lg text-sm font-medium transition-all",
                      isAdminPage 
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-sm" 
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    )}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Admin Mode
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* User Profile */}
          {user && (
            <div className="px-4 py-4 border-t border-slate-800/50">
              <div className="relative">
                <Button
                  variant="ghost"
                  className="w-full flex items-center space-x-3 p-3 hover:bg-slate-800/60 rounded-xl"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold">
                    {(user as any)?.username?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">{(user as any)?.username}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs px-2 py-0.5 text-emerald-400 border-emerald-500/30">
                        {formatPoints((user as any)?.total_points || 0)} pts
                      </Badge>
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        Rank #{(user as any)?.rank || 'N/A'}
                      </Badge>
                      {((user as any)?.email_2fa_enabled || (user as any)?.totp_enabled) && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 text-blue-400 border-blue-500/30">
                          2FA
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-slate-500 transition-transform duration-200",
                    userMenuOpen && "rotate-180"
                  )} />
                </Button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-xl shadow-black/50 z-50">
                    <div className="p-2">
                      <Link href="/settings" onClick={() => setUserMenuOpen(false)}>
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
                          setUserMenuOpen(false)
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Top Bar (for mobile and secondary actions) */}
      <header className="lg:pl-72 sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Mobile Logo */}
          <div className="lg:hidden">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-lime-400 animate-pulse" />
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                CTF Platform
              </h1>
            </Link>
          </div>

          {/* Center Search */}
          <div className="hidden md:block flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search challenges, users, or content..."
                className="w-full h-12 bg-slate-900/60 border-slate-700/50 pl-12 pr-6 text-base focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* Search for mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-10 w-10 p-0 text-slate-400 hover:text-white hover:bg-slate-800/60"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative h-10 w-10 p-0 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl"
            >
              <Bell className="h-5 w-5" />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden h-10 w-10 p-0 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Mobile Sign In/Up */}
            {!user && (
              <div className="lg:hidden flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />

      {/* Main content */}
      <main className="lg:pl-72 min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </div>
      </main>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  )
}