'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Shield, 
  Trophy, 
  Zap, 
  Users, 
  Settings, 
  Bot,
  FileText,
  BarChart3,
  Calendar,
  Target,
  Crown,
  Activity,
  Bell,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMe } from '@/lib/api/hooks'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { NotificationPopover } from '@/components/notification-popover'

const adminNavigation = [
  {
    name: 'Overview',
    href: '/admin',
    icon: Shield,
    description: 'Platform overview and statistics'
  },
  {
    name: 'Seasons',
    href: '/admin/seasons',
    icon: Trophy,
    description: 'Manage seasons and weeks'
  },
  {
    name: 'Challenges',
    href: '/admin/challenges',
    icon: Target,
    description: 'Library and management'
  },
  {
    name: 'AI Generator',
    href: '/admin/ai',
    icon: Bot,
    description: 'AI-powered challenge creation'
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management and roles'
  },
  {
    name: 'Labs',
    href: '/admin/labs',
    icon: Activity,
    description: 'Lab templates and instances'
  },
  {
    name: 'Audit Log',
    href: '/admin/audit',
    icon: FileText,
    description: 'System activity and logs'
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Platform analytics and insights'
  },
  {
    name: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
    description: 'Manage notifications'
  }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: user } = useMe()

  // Check if user has admin permissions
  console.log(user)
  const isAdmin = (user as any)?.role === 'ADMIN' || (user as any)?.role === 'AUTHOR' || (user as any)?.role === 'REVIEWER'
  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="text-center py-16">
            <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access the admin panel.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-background">
        {/* Admin Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-50 w-80 bg-card backdrop-blur-xl border-r border-border/50">
          <div className="flex flex-col h-full">
            {/* Admin Header - Modern Design */}
            <div className="px-6 py-8 flex flex-row items-center justify-start gap-4">
              <Link href="/" className="flex items-center group">
                <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
              </Link>
              <Link href="/admin" className="flex items-center space-x-4 group">
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary via-primary/95 to-primary/90 flex items-center justify-center shadow-lg shadow-primary/25 transition-all duration-200 group-hover:shadow-primary/40">
                    <Crown className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    Admin Panel
                  </h1>
                  <p className="text-sm text-muted-foreground">Platform Management</p>
                </div>
              </Link>
            </div>

            {/* Navigation - Modern Design */}
            <nav className="flex-1 px-4 space-y-1">
              <div className="mb-8">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-4">
                  Admin Menu
                </p>
                <div className="space-y-2">
                  {adminNavigation.map((item) => {
                    const isActive = pathname === item.href
                    const IconComponent = item.icon as React.ElementType
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href || ''}
                        className={cn(
                          'flex flex-col gap-2 px-4 py-2 rounded-xl text-base font-medium transition-all duration-200 group relative min-h-[64px]',
                          isActive
                            ? 'bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground shadow-lg'
                            : 'text-muted-foreground hover:bg-card/80 hover:text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <IconComponent className="h-6 w-6 flex-shrink-0" />
                          <span className="font-semibold">{item.name}</span>
                          {isActive && (
                            <div className="absolute right-4 w-2 h-2 rounded-full bg-primary-foreground" />
                          )}
                        </div>
                        <p className={cn(
                          "text-sm ml-10 transition-colors",
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground/80"
                        )}>
                          {item.description}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="lg:pl-80 flex flex-col flex-1">
          {/* Mobile Admin Header */}
          <div className="lg:hidden bg-card/90 backdrop-blur-xl border-b border-border/50 p-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary via-primary/95 to-primary/90 flex items-center justify-center shadow-lg">
                <Crown className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Admin Panel</h2>
                <p className="text-sm text-muted-foreground">Platform Management</p>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <main className="flex-1 lg:px-20">
            {children}
          </main>
        </div>

        {/* Floating Notifications Button - Desktop Only */}
        <div className="hidden lg:block">
          <NotificationPopover />
        </div>
      </div>
    </AuthGuard>
  )
}
