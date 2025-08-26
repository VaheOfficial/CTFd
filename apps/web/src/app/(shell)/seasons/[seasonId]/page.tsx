'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSeason, useSeasonWeeks, useMe } from '@/lib/api/hooks'
import { formatPoints } from '@/lib/utils'
import { 
  Trophy, 
  Calendar, 
  Users, 
  Target, 
  Clock,
  ArrowRight,
  Lock,
  CheckCircle,
  PlayCircle,
  Star
} from 'lucide-react'

export default function SeasonPage() {
  const params = useParams()
  const seasonId = params.seasonId as string
  
  const { data: season, isLoading: seasonLoading } = useSeason(seasonId)
  const { data: weeks, isLoading: weeksLoading } = useSeasonWeeks(seasonId)
  const { data: user } = useMe()

  const isLoading = seasonLoading || weeksLoading

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

  const getWeekStatus = (week: any) => {
    const now = new Date()
    const startDate = new Date(week.start_date)
    const endDate = new Date(week.end_date)
    
    if (now < startDate) return 'upcoming'
    if (now > endDate) return 'completed'
    return 'active'
  }

  const getWeekIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'active':
        return <PlayCircle className="h-5 w-5 text-brand" />
      case 'upcoming':
        return <Lock className="h-5 w-5 text-slate-400" />
      default:
        return <Clock className="h-5 w-5 text-slate-400" />
    }
  }

  const getWeekBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'active':
        return 'default'
      case 'upcoming':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-8">
      {/* Season Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/seasons" className="hover:text-brand">Seasons</Link>
          <ArrowRight className="h-4 w-4" />
          <span>{season.name}</span>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-brand" />
              {season.name}
              {season.is_active && (
                <Star className="h-6 w-6 text-yellow-400" />
              )}
            </h1>
            <p className="text-muted-foreground text-lg">
              {season.description}
            </p>
          </div>
          
          <div className="flex gap-4">
            <Link href={`/leaderboard/season/${seasonId}`}>
              <Button variant="outline">
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </Button>
            </Link>
            {season.is_active && (
              <Link href="/challenges">
                <Button>
                  <Target className="h-4 w-4 mr-2" />
                  View Challenges
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Season Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Week</CardTitle>
            <Calendar className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Week {season.current_week || 1}
            </div>
            <p className="text-xs text-muted-foreground">
              of {season.total_weeks || 8} weeks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Challenges</CardTitle>
            <Target className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{season.total_challenges || 0}</div>
            <p className="text-xs text-muted-foreground">
              across all weeks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{season.total_participants || 0}</div>
            <p className="text-xs text-muted-foreground">
              registered players
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Progress</CardTitle>
            <Star className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPoints((user as any)?.total_points || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              total points
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Season Progress */}
      {season.is_active && (
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
                <span>Week {season.current_week || 1} of {season.total_weeks || 8}</span>
                <span>{Math.round(((season.current_week || 1) / (season.total_weeks || 8)) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div 
                  className="bg-brand h-3 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${Math.round(((season.current_week || 1) / (season.total_weeks || 8)) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week Timeline */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {season.is_active ? 'Week Timeline' : 'Season Structure'}
        </h2>
        
        {weeks && weeks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {weeks.map((week: any) => {
              const status = getWeekStatus(week)
              return (
                <Card 
                  key={week.id} 
                  className={`transition-all duration-200 hover:shadow-lg ${
                    status === 'active' ? 'border-brand/50 bg-brand/5' : 
                    status === 'completed' ? 'border-green-500/30' : 
                    'border-slate-700'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getWeekIcon(status)}
                        <CardTitle className="text-lg">Week {week.index}</CardTitle>
                      </div>
                      <Badge variant={getWeekBadgeVariant(status)}>
                        {status.toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription>
                      {week.theme || `Week ${week.index} challenges`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">{week.challenge_count || 0}</div>
                        <div className="text-muted-foreground">Challenges</div>
                      </div>
                      <div>
                        <div className="font-medium">{formatPoints(week.total_points || 0)}</div>
                        <div className="text-muted-foreground">Points</div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}
                    </div>

                    {status !== 'upcoming' ? (
                      <Link href={`/seasons/${seasonId}/weeks/${week.index}`}>
                        <Button 
                          variant={status === 'active' ? 'default' : 'outline'} 
                          size="sm" 
                          className="w-full"
                        >
                          {status === 'active' ? 'View Challenges' : 'View Results'}
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" size="sm" className="w-full" disabled>
                        <Lock className="h-4 w-4 mr-2" />
                        Locked
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-16">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">No Weeks Scheduled</CardTitle>
              <CardDescription>
                Week structure will be available soon
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
