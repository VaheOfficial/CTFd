'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MobileDrawer } from '@/components/shared/mobile-drawer'
import { NotificationPopover } from '@/components/notification-popover'
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
    <div className="min-h-screen bg-background">
      {/* Left Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 z-50 w-80 bg-card backdrop-blur-xl border-r border-border/50 hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo Header - Discord/Linear inspired */}
          <div className="px-6 py-8">
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25 transition-all duration-200 group-hover:shadow-primary/40">
                  <Shield className="h-9 w-9 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-accent rounded-full border-2 border-card flex items-center justify-center">
                  <div className="h-2.5 w-2.5 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  BlackBox
                </h1>
                <p className="text-base text-muted-foreground">Defensive Cyber Ops</p>
              </div>
            </Link>
          </div>

          {/* Navigation Menu - Modern design */}
          <nav className="flex-1 px-4 space-y-1">
            <div className="mb-8">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-4">
                Main Menu
              </p>
              <div className="space-y-2">
                {currentNav.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/' && pathname?.startsWith(item.href))
                  const IconComponent = item.icon
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-200 group relative min-h-[48px]',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <IconComponent className={cn(
                        "h-6 w-6 transition-colors duration-200",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      <span>{item.name}</span>
                      {isActive && (
                        <div className="absolute right-4 w-2 h-2 bg-primary-foreground rounded-full"></div>
                      )}
                    </Link>
                  )
                }) as React.ReactNode}
              </div>
            </div>
          </nav>

          {/* Admin/User Mode Toggle - Discord-style */}
          {isAdmin && (
            <div className="px-4 py-6">
              <div className="mb-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-4">
                  Mode
                </p>
              </div>
              <div className="flex rounded-xl gap-1 p-1 bg-muted/30">
                <Link href="/" className="flex-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full h-12 rounded-lg text-base font-medium transition-all duration-200",
                      !isAdminPage 
                        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" 
                        : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
                    )}
                  >
                    User
                  </Button>
                </Link>
                <Link href="/admin" className="flex-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full h-12 rounded-lg text-base font-medium transition-all duration-200",
                      isAdminPage 
                        ? "bg-secondary text-secondary-foreground shadow-md" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    Admin
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* User Profile - Modern card style */}
          {user && (
            <div className="px-4 py-6 border-t border-border/50">
              <div className="relative">
                <Button
                  variant="ghost"
                  className="w-full flex items-center space-x-4 p-4 hover:bg-muted/30 rounded-xl transition-all duration-200 group min-h-[64px]"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="relative">
                    <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20 text-lg">
                      {(user as any)?.username?.charAt(0)?.toUpperCase()}
                    </div>
                    {((user as any)?.email_2fa_enabled || (user as any)?.totp_enabled) && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 bg-accent rounded-full border-2 border-card flex items-center justify-center">
                        <Shield className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-base">
                      {(user as any)?.username}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {formatPoints((user as any)?.total_points || 0)} pts
                      </span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        Rank #{(user as any)?.rank || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-muted-foreground transition-all duration-200 group-hover:text-foreground",
                    userMenuOpen && "rotate-180"
                  )} />
                </Button>
                {/* User Dropdown - Modern style */}
                {userMenuOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-4 rounded-xl bg-card backdrop-blur-xl border border-border/50 shadow-xl shadow-black/10 z-50">
                    <div className="p-3">
                      <Link href="/settings" className='' onClick={() => setUserMenuOpen(false)}>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start hover:bg-muted/50 rounded-lg transition-all duration-200 group h-12 text-base"
                        >
                          <Settings className="h-5 w-5 mr-3 text-muted-foreground group-hover:text-foreground" />
                          <span className="group-hover:text-foreground">Settings</span>
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200 group h-12 text-base"
                        onClick={() => {
                          logoutMutation.mutate()
                          setUserMenuOpen(false)
                        }}
                      >
                        <LogOut className="h-5 w-5 mr-3" />
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

      {/* Mobile Top Bar (minimal, only for mobile) */}
      <header className="lg:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Mobile Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-lg font-bold text-foreground">
              BlackBox
            </h1>
          </Link>

          {/* Mobile Actions */}
          <div className="flex items-center space-x-2">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Mobile Sign In/Up */}
            {!user && (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Floating Notifications Button - Desktop Only */}
      <div className="hidden lg:block">
        <NotificationPopover />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />

      {/* Main content */}
      <main className="lg:pl-80 min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:pr-20">
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