'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSeason, useMe, useLeaderboard } from '@/lib/api/hooks'
import { formatPoints } from '@/lib/utils'
import { 
  Trophy, 
  Calendar, 
  Users, 
  Target, 
  Clock,
  ArrowRight,
  Star,
  Crown,
  Medal,
  Award
} from 'lucide-react'
import type { components } from '@/lib/api/types'

type SeasonResponse = components['schemas']['SeasonResponse']

export default function SeasonPage() {
  const params = useParams()
  const seasonId = params.seasonId as string
  
  const { data: season, isLoading: seasonLoading } = useSeason(seasonId)
  const { data: user } = useMe()
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(seasonId, 50)

  const isLoading = seasonLoading

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!season) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="text-center py-16">
            <Target className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">Season Not Found</CardTitle>
            <CardDescription>
              The requested season could not be loaded
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Type guard to ensure season is properly typed
  const typedSeason = season as SeasonResponse

  // Helper function to calculate days
  const calculateDays = (season: SeasonResponse) => {
    const start = new Date(season.start_at)
    const end = new Date(season.end_at)
    const now = new Date()
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const elapsedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    const remainingDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    
    return {
      total: totalDays,
      elapsed: Math.min(elapsedDays, totalDays),
      remaining: remainingDays,
      percentage: Math.min(100, Math.round((elapsedDays / totalDays) * 100))
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />
      case 2:
        return <Medal className="h-5 w-5 text-slate-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <span className="w-5 text-center font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'border-yellow-400/50 bg-yellow-400/10'
      case 2:
        return 'border-slate-400/50 bg-slate-400/10'
      case 3:
        return 'border-amber-600/50 bg-amber-600/10'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-8">
      {/* Season Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/seasons" className="hover:text-brand">Seasons</Link>
          <ArrowRight className="h-4 w-4" />
          <span>{typedSeason.name}</span>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-brand" />
              {typedSeason.name}
              {typedSeason.is_active && (
                <Star className="h-6 w-6 text-yellow-400" />
              )}
            </h1>
            <p className="text-muted-foreground text-lg">
              {typedSeason.description}
            </p>
          </div>
          
          {typedSeason.is_active && (
            <Link href="/challenges">
              <Button>
                <Target className="h-4 w-4 mr-2" />
                View Challenges
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Season Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaderboard?.total_participants || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              competing players
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Points</CardTitle>
            <Star className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPoints((user as any)?.total_points || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              total score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Rank</CardTitle>
            <Trophy className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              #{leaderboard?.entries?.find((e: any) => e.is_current_user)?.rank || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              current position
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Season Progress */}
      {typedSeason.is_active && (() => {
        const days = calculateDays(typedSeason)
        return (
          <Card>
            <CardHeader>
              <CardTitle>Season Progress</CardTitle>
              <CardDescription>
                Track your progress through the season
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Day {days.elapsed} of {days.total}</span>
                  <span>{days.percentage}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-brand h-3 rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${days.percentage}%` 
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{days.remaining} days remaining</span>
                  <span>Ends {new Date(typedSeason.end_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-brand" />
            Season Leaderboard
          </CardTitle>
          <CardDescription>
            Top performers in {typedSeason.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboardLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-3">
                  <div className="w-8 h-4 bg-slate-700 rounded"></div>
                  <div className="flex-1 h-4 bg-slate-700 rounded"></div>
                  <div className="w-16 h-4 bg-slate-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : leaderboard?.entries && leaderboard.entries.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.entries.map((entry: any) => (
                <div 
                  key={entry.user_id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors hover:bg-slate-800/50 ${
                    entry.is_current_user ? 'border-brand/50 bg-brand/10' : 'border-slate-700'
                  } ${getRankColor(entry.rank)}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {entry.username}
                        {entry.is_current_user && (
                          <Badge variant="default" className="text-xs">YOU</Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {entry.challenges_solved} challenges solved
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-brand">
                      {formatPoints(entry.total_points)}
                    </p>
                    {entry.last_submission && (
                      <p className="text-xs text-muted-foreground">
                        Last: {new Date(entry.last_submission).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No participants yet. Be the first to compete!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
