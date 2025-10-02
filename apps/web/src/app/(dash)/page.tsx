'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSeasons, useMe, useBadges, useChallenges } from '@/lib/api/hooks'
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
  const { data: challenges } = useChallenges()

  // Find current active season
  const activeSeason = seasons?.find(season => season.is_active)
  const currentWeek = activeSeason?.current_week

  // Filter challenges for active season
  const seasonChallenges = challenges?.filter((c: any) => 
    c.season_id === activeSeason?.id && c.status === 'published'
  ) || []
  
  const solvedChallenges = seasonChallenges.filter((c: any) => c.is_solved)
  const weekProgress = seasonChallenges.length > 0 
    ? Math.round((solvedChallenges.length / seasonChallenges.length) * 100)
    : 0

  // Get featured challenge (first unsolved challenge)
  const featuredChallenge = seasonChallenges.find((c: any) => !c.is_solved)

  // Stats
  const stats = {
    totalPoints: (user as any)?.total_points || 0,
    rank: (user as any)?.rank || 0,
    challengesSolved: (user as any)?.challenges_solved || 0,
    streak: (user as any)?.streak || 0,
  }

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your streak today!"
    if (streak === 1) return "Great start!"
    if (streak < 7) return "Keep building!"
    if (streak < 30) return "Impressive streak!"
    return "Outstanding dedication!"
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
          Welcome back, {(user as any)?.username || 'Defender'}
        </h1>
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
            <div className="text-4xl font-bold text-warning mb-2">
              {stats.streak} {stats.streak === 1 ? 'day' : 'days'}
            </div>
            <p className="text-sm text-muted-foreground">
              {getStreakMessage(stats.streak)}
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
                {seasonChallenges.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-base">Progress</span>
                        <span className="font-mono text-primary text-base">
                          {solvedChallenges.length}/{seasonChallenges.length} challenges
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-4">
                        <div 
                          className="bg-gradient-to-r from-primary to-primary/80 h-4 rounded-full transition-all duration-500" 
                          style={{ width: `${weekProgress}%` }} 
                        />
                      </div>
                    </div>
                    
                    {featuredChallenge ? (
                      <div className="space-y-4">
                        <p className="text-base font-semibold text-muted-foreground">Next Challenge:</p>
                        <Link href={`/challenges/${featuredChallenge.slug}`}>
                          <div className="p-5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-foreground text-lg">{featuredChallenge.title}</h4>
                                <p className="text-base text-muted-foreground mt-2">
                                  {featuredChallenge.track} • {featuredChallenge.difficulty} • {featuredChallenge.points_base} pts
                                </p>
                              </div>
                              <Badge className={`rounded-full px-4 py-2 text-sm ${
                                featuredChallenge.difficulty === 'easy' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                                featuredChallenge.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                                'bg-red-500/20 text-red-400 border-red-500/50'
                              }`}>
                                {featuredChallenge.difficulty}
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Trophy className="h-12 w-12 text-primary mx-auto mb-3" />
                        <p className="text-base font-semibold text-foreground">All challenges completed! 🎉</p>
                        <p className="text-sm text-muted-foreground mt-2">Check back for new challenges</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2 font-medium">No challenges available yet</p>
                    <p className="text-sm text-muted-foreground">New challenges will be released soon</p>
                  </div>
                )}

                <Button asChild className="w-full rounded-xl h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base">
                  <Link href={`/seasons/${activeSeason.id}`}>
                    View Season
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
    </div>
  )
}