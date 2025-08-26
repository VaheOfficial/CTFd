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
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMe } from '@/lib/api/hooks'

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
    description: 'Challenge library and management'
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
    <div className="flex min-h-screen bg-slate-950">
      {/* Admin Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 lg:pt-16">
        <div className="flex flex-col flex-grow bg-slate-900 border-r border-slate-800 overflow-y-auto">
          {/* Admin Header */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg">
                <Crown className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Admin Panel</h2>
                <p className="text-sm text-slate-400">Platform Management</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              const IconComponent = item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex flex-col p-4 rounded-xl transition-all duration-200 border',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border-transparent hover:border-slate-700'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <IconComponent className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-white"
                    )} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <p className={cn(
                    "text-xs mt-1 ml-8 transition-colors",
                    isActive ? "text-emerald-300/70" : "text-slate-500 group-hover:text-slate-400"
                  )}>
                    {item.description}
                  </p>
                </Link>
              )
            })}
          </nav>

          {/* Admin Stats */}
          <div className="p-4 border-t border-slate-800">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-slate-800/50">
                  <div className="text-lg font-bold text-emerald-400">1,247</div>
                  <div className="text-xs text-slate-400">Users</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-800/50">
                  <div className="text-lg font-bold text-blue-400">38</div>
                  <div className="text-xs text-slate-400">Challenges</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-800/50">
                  <div className="text-lg font-bold text-purple-400">1</div>
                  <div className="text-xs text-slate-400">Active Season</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-800/50">
                  <div className="text-lg font-bold text-yellow-400">2.8K</div>
                  <div className="text-xs text-slate-400">Submissions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col flex-1">
        {/* Mobile Admin Header */}
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">Admin Panel</h2>
              <p className="text-xs text-slate-400">Platform Management</p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
