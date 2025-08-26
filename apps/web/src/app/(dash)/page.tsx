'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSeasons, useMe, useBadges } from '@/lib/api/hooks'
import { 
  Trophy, 
  Target, 
  Zap, 
  Clock, 
  TrendingUp,
  Medal,
  Calendar,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: user } = useMe()
  const { data: seasons } = useSeasons()
  const { data: badges } = useBadges()

  // Find current active season
  const activeSeason = seasons?.find(season => season.is_active)
  const currentWeek = activeSeason?.current_week

  // Mock data for demonstration - replace with actual API calls
  const stats = {
    totalPoints: (user as any)?.total_points || 0,
    rank: (user as any)?.rank || 0,
    challengesSolved: (user as any)?.challenges_solved || 0,
    streak: (user as any)?.streak || 0,
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {(user as any)?.username || 'Defender'}
        </h1>
        <p className="text-muted-foreground">
          Ready to strengthen your defensive cyber operations skills?
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Trophy className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPoints}</div>
            <p className="text-xs text-muted-foreground">
              +{Math.floor(stats.totalPoints * 0.1)} from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Rank</CardTitle>
            <TrendingUp className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{stats.rank || 'Unranked'}</div>
            <p className="text-xs text-muted-foreground">
              {stats.rank ? 'In leaderboard' : 'Complete challenges to rank'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Challenges Solved</CardTitle>
            <Target className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.challengesSolved}</div>
            <p className="text-xs text-muted-foreground">
              Across all seasons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Zap className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.streak} days</div>
            <p className="text-xs text-muted-foreground">
              Keep it up!
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* This Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-brand" />
              <span>This Week</span>
            </CardTitle>
            {activeSeason && (
              <CardDescription>
                Week {currentWeek} of {activeSeason.name}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSeason ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>2/5 challenges</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-brand h-2 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Featured Challenge:</p>
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Network Traffic Analysis</h4>
                        <p className="text-sm text-muted-foreground">Forensics • Medium • 200 pts</p>
                      </div>
                      <Badge variant="outline" className="text-difficulty-medium-text bg-difficulty-medium-bg border-difficulty-medium-border">
                        Medium
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button asChild className="w-full">
                  <Link href={`/seasons/${activeSeason.id}`}>
                    View All Challenges
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No active season</p>
                <Button asChild>
                  <Link href="/seasons">View All Seasons</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Medal className="h-5 w-5 text-brand" />
              <span>Recent Badges</span>
            </CardTitle>
            <CardDescription>
              Your latest achievements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {badges && badges.length > 0 ? (
              <div className="space-y-3">
                {badges.slice(0, 3).map((badge) => (
                  <div 
                    key={badge.id}
                    className="flex items-center space-x-3 p-2 rounded-lg bg-slate-800/50"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center">
                      <Medal className="h-4 w-4 text-brand" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                ))}
                
                <Button asChild variant="outline" className="w-full">
                  <Link href="/badges">
                    View All Badges
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Medal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No badges earned yet</p>
                <p className="text-sm text-muted-foreground">
                  Complete challenges to earn your first badge!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-brand" />
            <span>Latest Announcements</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-l-4 border-brand pl-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Week 3 Challenges Now Live!</h4>
              <span className="text-sm text-muted-foreground">2 hours ago</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Five new defensive cybersecurity challenges covering incident response, 
              malware analysis, and network forensics.
            </p>
          </div>
          
          <div className="border-l-4 border-slate-600 pl-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">New AI Challenge Generator</h4>
              <span className="text-sm text-muted-foreground">1 day ago</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Administrators can now generate custom challenges using our AI system. 
              Expect more diverse content!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}