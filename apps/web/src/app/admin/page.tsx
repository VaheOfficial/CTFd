'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Users, 
  Trophy, 
  Zap, 
  BarChart3, 
  FileText, 
  Bot,
  Settings,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { useAppSelector } from '@/lib/redux/hooks'

export default function AdminPage() {
  const admin = useAppSelector((s) => s.stats.admin)

  return (
    <div className="space-y-10 p-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20 shadow-lg">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          Admin Dashboard
        </h1>
        <p className="text-lg text-muted-foreground ml-16">
          Manage your Defensive Cyberspace Operations Platform
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold text-card-foreground">Total Users</CardTitle>
            <div className="p-3 rounded-xl bg-secondary/10">
              <Users className="h-6 w-6 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-secondary mb-2">{admin.total_users.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold text-card-foreground">Active Seasons</CardTitle>
            <div className="p-3 rounded-xl bg-primary/10">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary mb-2">{admin.active_seasons}</div>
            <p className="text-sm text-muted-foreground">
              Winter DCO Challenge
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold text-card-foreground">Total Challenges</CardTitle>
            <div className="p-3 rounded-xl bg-accent/10">
              <Zap className="h-6 w-6 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-accent mb-2">{admin.total_challenges}</div>
            <p className="text-sm text-muted-foreground">
              {admin.pending_challenges} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold text-card-foreground">This Week</CardTitle>
            <div className="p-3 rounded-xl bg-warning/10">
              <BarChart3 className="h-6 w-6 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-warning mb-2">{admin.this_week_submissions.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">
              flag submissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl">AI Challenge Generator</span>
            </CardTitle>
            <CardDescription className="text-base">
              Generate new challenges using AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-base text-muted-foreground">
              <p>Today: {admin.ai_generations_today} challenges generated</p>
            </div>
            <Link href="/admin/ai">
              <Button size="lg" className="w-full">
                Generate Challenge
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-secondary/20 via-secondary/15 to-secondary/10 border border-secondary/20">
                <Trophy className="h-6 w-6 text-secondary" />
              </div>
              <span className="text-xl">Season Management</span>
            </CardTitle>
            <CardDescription className="text-base">
              Create and manage seasons
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-base text-muted-foreground space-y-1">
              <p>Current: Winter DCO Challenge</p>
              <p>Week 3 of 8 • 5 challenges this week</p>
            </div>
            <Link href="/admin/seasons">
              <Button variant="outline" size="lg" className="w-full">
                Manage Seasons
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-accent/20 via-accent/15 to-accent/10 border border-accent/20">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <span className="text-xl">Challenge Library</span>
            </CardTitle>
            <CardDescription className="text-base">
              Browse and manage challenges
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-base text-muted-foreground space-y-2">
              <p>{admin.total_challenges} total challenges</p>
              <div className="flex gap-2">
                <Badge variant="success">Published: 35</Badge>
                <Badge variant="warning">Draft: 3</Badge>
              </div>
            </div>
            <Link href="/admin/challenges">
              <Button variant="outline" size="lg" className="w-full">
                Manage Challenges
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-secondary/20 via-secondary/15 to-secondary/10 border border-secondary/20">
                <Users className="h-6 w-6 text-secondary" />
              </div>
              <span className="text-xl">User Management</span>
            </CardTitle>
            <CardDescription className="text-base">
              Manage users and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-base text-muted-foreground space-y-1">
              <p>{admin.total_users.toLocaleString()} registered users</p>
              <p>43 active this week</p>
            </div>
            <Link href="/admin/users">
              <Button variant="outline" size="lg" className="w-full">
                Manage Users
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-warning/20 via-warning/15 to-warning/10 border border-warning/20">
                <FileText className="h-6 w-6 text-warning" />
              </div>
              <span className="text-xl">Audit Logs</span>
            </CardTitle>
            <CardDescription className="text-base">
              Review system activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-base text-muted-foreground space-y-1">
              <p>247 events today</p>
              <p>Last: Challenge published (2 min ago)</p>
            </div>
            <Link href="/admin/audit">
              <Button variant="outline" size="lg" className="w-full">
                View Audit Log
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl">System Settings</span>
            </CardTitle>
            <CardDescription className="text-base">
              Configure platform settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-base text-muted-foreground space-y-1">
              <p>Email: Enabled</p>
              <p>Labs: 3 templates active</p>
            </div>
            <Button variant="outline" size="lg" className="w-full">
              System Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-accent/20 via-accent/15 to-accent/10 border border-accent/20">
              <Activity className="h-6 w-6 text-accent" />
            </div>
            <span className="text-xl">Recent Activity</span>
          </CardTitle>
          <CardDescription className="text-base">
            Latest administrative actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="flex items-center space-x-4 text-base p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
              <div className="w-3 h-3 bg-emerald-400 rounded-full flex-shrink-0"></div>
              <span className="text-muted-foreground font-medium min-w-fit">2 min ago</span>
              <span className="text-foreground">Challenge "Advanced Network Forensics" published to Week 3</span>
            </div>
            <div className="flex items-center space-x-4 text-base p-3 rounded-xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20">
              <div className="w-3 h-3 bg-blue-400 rounded-full flex-shrink-0"></div>
              <span className="text-muted-foreground font-medium min-w-fit">15 min ago</span>
              <span className="text-foreground">AI generated challenge "Malware Analysis Lab" created</span>
            </div>
            <div className="flex items-center space-x-4 text-base p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20">
              <div className="w-3 h-3 bg-yellow-400 rounded-full flex-shrink-0"></div>
              <span className="text-muted-foreground font-medium min-w-fit">1 hour ago</span>
              <span className="text-foreground">User "security_student" promoted to moderator</span>
            </div>
            <div className="flex items-center space-x-4 text-base p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20">
              <div className="w-3 h-3 bg-purple-400 rounded-full flex-shrink-0"></div>
              <span className="text-muted-foreground font-medium min-w-fit">3 hours ago</span>
              <span className="text-foreground">Leaderboard snapshot created for Week 2</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
