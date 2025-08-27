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
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
          Welcome back, {(user as any)?.username || 'Defender'}
        </h1>
        <p className="text-lg text-muted-foreground">
          Ready to strengthen your defensive cyber operations skills?
        </p>
      </div>

      {/* Quick Stats - Modern cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold text-card-foreground">Total Points</CardTitle>
            <div className="p-3 rounded-xl bg-primary/10">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary mb-2">{stats.totalPoints}</div>
            <p className="text-sm text-muted-foreground">
              +{Math.floor(stats.totalPoints * 0.1)} from last week
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold text-card-foreground">Current Rank</CardTitle>
            <div className="p-3 rounded-xl bg-secondary/10">
              <TrendingUp className="h-6 w-6 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-secondary mb-2">#{stats.rank || 'N/A'}</div>
            <p className="text-sm text-muted-foreground">
              {stats.rank ? 'In leaderboard' : 'Complete challenges to rank'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold text-card-foreground">Challenges Solved</CardTitle>
            <div className="p-3 rounded-xl bg-accent/10">
              <Target className="h-6 w-6 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-accent mb-2">{stats.challengesSolved}</div>
            <p className="text-sm text-muted-foreground">
              Across all seasons
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold text-card-foreground">Current Streak</CardTitle>
            <div className="p-3 rounded-xl bg-warning/10">
              <Zap className="h-6 w-6 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-warning mb-2">{stats.streak} days</div>
            <p className="text-sm text-muted-foreground">
              Keep it up!
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* This Week */}
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/80 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-semibold">This Week</span>
            </CardTitle>
            {activeSeason && (
              <CardDescription className="text-base mt-2 ml-14">
                Week {currentWeek} of {activeSeason.name}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-8">
            {activeSeason ? (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-base">Progress</span>
                    <span className="font-mono text-primary text-base">2/5 challenges</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div className="bg-gradient-to-r from-primary to-primary/80 h-4 rounded-full transition-all duration-500" style={{ width: '40%' }} />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <p className="text-base font-semibold text-muted-foreground">Featured Challenge:</p>
                  <div className="p-5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground text-lg">Network Traffic Analysis</h4>
                        <p className="text-base text-muted-foreground mt-2">Forensics • Medium • 200 pts</p>
                      </div>
                      <Badge className="text-difficulty-medium-text bg-difficulty-medium-bg border-difficulty-medium-border rounded-full px-4 py-2 text-sm">
                        Medium
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button asChild className="w-full rounded-xl h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base">
                  <Link href={`/seasons/${activeSeason.id}`}>
                    View All Challenges
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-6 text-base">No active season</p>
                <Button asChild className="rounded-xl h-12 text-base">
                  <Link href="/seasons">View All Seasons</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Badges */}
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/80 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-secondary/10">
                <Medal className="h-6 w-6 text-secondary" />
              </div>
              <span className="text-xl font-semibold">Recent Badges</span>
            </CardTitle>
            <CardDescription className="text-base">
              Your latest achievements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {badges && badges.length > 0 ? (
              <div className="space-y-4">
                {badges.slice(0, 3).map((badge) => (
                  <div 
                    key={badge.id}
                    className="flex items-center space-x-4 p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center shadow-lg shadow-secondary/25">
                      <Medal className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{badge.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                    </div>
                  </div>
                ))}
                
                <Button asChild variant="outline" className="w-full rounded-xl h-12 border-border/50 hover:bg-muted/50">
                  <Link href="/badges">
                    View All Badges
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <Medal className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2 font-medium">No badges earned yet</p>
                <p className="text-sm text-muted-foreground">
                  Complete challenges to earn your first badge!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <Card className="rounded-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/80 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-warning/10">
              <Zap className="h-6 w-6 text-warning" />
            </div>
            <span className="text-xl font-semibold">Latest Announcements</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex space-x-4">
            <div className="w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground">Week 3 Challenges Now Live!</h4>
                <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">2h ago</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Five new defensive cybersecurity challenges covering incident response, 
                malware analysis, and network forensics.
              </p>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <div className="w-1 bg-gradient-to-b from-secondary to-secondary/50 rounded-full"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground">New AI Challenge Generator</h4>
                <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">1d ago</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Administrators can now generate custom challenges using our AI system. 
                Expect more diverse content!
              </p>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">System Status</span>
            </div>
            <p className="text-sm text-foreground font-medium">All systems operational</p>
            <p className="text-xs text-muted-foreground mt-1">Next maintenance: Sunday 02:00 UTC</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}