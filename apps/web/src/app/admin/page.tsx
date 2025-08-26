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
  Settings
} from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  // Mock admin stats
  const stats = {
    totalUsers: 1247,
    activeSeasons: 1,
    totalChallenges: 38,
    thisWeekSubmissions: 2847,
    pendingChallenges: 3,
    aiGenerationsToday: 12
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-brand" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your CTE Platform instance
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Seasons</CardTitle>
            <Trophy className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSeasons}</div>
            <p className="text-xs text-muted-foreground">
              Winter DCO Challenge
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Challenges</CardTitle>
            <Zap className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChallenges}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingChallenges} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <BarChart3 className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeekSubmissions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              flag submissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-brand" />
              AI Challenge Generator
            </CardTitle>
            <CardDescription>
              Generate new challenges using AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Today: {stats.aiGenerationsToday} challenges generated</p>
            </div>
            <Link href="/admin/ai">
              <Button className="w-full">
                Generate Challenge
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand" />
              Season Management
            </CardTitle>
            <CardDescription>
              Create and manage seasons
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Current: Winter DCO Challenge</p>
              <p>Week 3 of 8 • 5 challenges this week</p>
            </div>
            <Link href="/admin/seasons">
              <Button variant="outline" className="w-full">
                Manage Seasons
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand" />
              Challenge Library
            </CardTitle>
            <CardDescription>
              Browse and manage challenges
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>{stats.totalChallenges} total challenges</p>
              <div className="flex gap-2">
                <Badge variant="outline">Published: 35</Badge>
                <Badge variant="warning">Draft: 3</Badge>
              </div>
            </div>
            <Link href="/admin/challenges">
              <Button variant="outline" className="w-full">
                Manage Challenges
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage users and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>{stats.totalUsers.toLocaleString()} registered users</p>
              <p>43 active this week</p>
            </div>
            <Link href="/admin/users">
              <Button variant="outline" className="w-full">
                Manage Users
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand" />
              Audit Logs
            </CardTitle>
            <CardDescription>
              Review system activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>247 events today</p>
              <p>Last: Challenge published (2 min ago)</p>
            </div>
            <Link href="/admin/audit">
              <Button variant="outline" className="w-full">
                View Audit Log
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-brand" />
              System Settings
            </CardTitle>
            <CardDescription>
              Configure platform settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Email: Enabled</p>
              <p>Labs: 3 templates active</p>
            </div>
            <Button variant="outline" className="w-full">
              System Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest administrative actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-muted-foreground">2 min ago</span>
              <span>Challenge "Advanced Network Forensics" published to Week 3</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-muted-foreground">15 min ago</span>
              <span>AI generated challenge "Malware Analysis Lab" created</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-muted-foreground">1 hour ago</span>
              <span>User "security_student" promoted to moderator</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-muted-foreground">3 hours ago</span>
              <span>Leaderboard snapshot created for Week 2</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
