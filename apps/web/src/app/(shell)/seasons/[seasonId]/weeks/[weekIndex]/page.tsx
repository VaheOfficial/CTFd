'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWeek, useWeekChallenges, useSeason } from '@/lib/api/hooks'
import { formatPoints, getDifficultyVariant, getTrackColor } from '@/lib/utils'
import { 
  Trophy, 
  Calendar, 
  Target, 
  Clock,
  ArrowRight,
  Zap,
  CheckCircle,
  PlayCircle,
  Server,
  Download,
  Users
} from 'lucide-react'

export default function WeekPage() {
  const params = useParams()
  const seasonId = params.seasonId as string
  const weekIndex = parseInt(params.weekIndex as string)
  
  const { data: season } = useSeason(seasonId)
  const { data: week, isLoading: weekLoading } = useWeek(seasonId, weekIndex)
  const { data: challenges, isLoading: challengesLoading } = useWeekChallenges(seasonId, weekIndex)

  const isLoading = weekLoading || challengesLoading

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

  if (!week) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="text-center py-16">
            <Target className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">Week Not Found</CardTitle>
            <CardDescription>
              The requested week could not be loaded
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getWeekStatus = () => {
    const now = new Date()
    const startDate = new Date(week.start_date)
    const endDate = new Date(week.end_date)
    
    if (now < startDate) return 'upcoming'
    if (now > endDate) return 'completed'
    return 'active'
  }

  const getChallengeStatus = (challenge: any) => {
    if (challenge.user_solved) return 'solved'
    if (challenge.user_attempted) return 'attempted'
    return 'unsolved'
  }

  const getChallengeIcon = (status: string) => {
    switch (status) {
      case 'solved':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'attempted':
        return <PlayCircle className="h-5 w-5 text-yellow-400" />
      default:
        return <Target className="h-5 w-5 text-slate-400" />
    }
  }

  const weekStatus = getWeekStatus()

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/seasons" className="hover:text-brand">Seasons</Link>
        <ArrowRight className="h-4 w-4" />
        <Link href={`/seasons/${seasonId}`} className="hover:text-brand">
          {season?.name || 'Season'}
        </Link>
        <ArrowRight className="h-4 w-4" />
        <span>Week {weekIndex}</span>
      </div>

      {/* Week Header */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-8 w-8 text-brand" />
              Week {weekIndex}
              {weekStatus === 'active' && (
                <Badge variant="default">ACTIVE</Badge>
              )}
              {weekStatus === 'completed' && (
                <Badge variant="outline">COMPLETED</Badge>
              )}
              {weekStatus === 'upcoming' && (
                <Badge variant="outline">UPCOMING</Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-lg">
              {week.theme || `Week ${weekIndex} Challenges`}
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex gap-4">
            <Link href={`/leaderboard/season/${seasonId}`}>
              <Button variant="outline">
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Week Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Challenges</CardTitle>
            <Target className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{challenges?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Zap className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPoints(week.total_points || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Progress</CardTitle>
            <CheckCircle className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {challenges?.filter((c: any) => c.user_solved).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              solved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Points</CardTitle>
            <Trophy className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPoints(challenges?.reduce((acc: number, c: any) => 
                acc + (c.user_solved ? c.points_awarded || c.points_base : 0), 0) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {challenges && challenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Week Progress</CardTitle>
            <CardDescription>
              Your completion progress for this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {challenges.filter((c: any) => c.user_solved).length} of {challenges.length} challenges solved
                </span>
                <span>
                  {Math.round((challenges.filter((c: any) => c.user_solved).length / challenges.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div 
                  className="bg-brand h-3 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${Math.round((challenges.filter((c: any) => c.user_solved).length / challenges.length) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Challenges List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Challenges</h2>
        
        {challenges && challenges.length > 0 ? (
          <div className="grid gap-6">
            {challenges.map((challenge: any) => {
              const status = getChallengeStatus(challenge)
              return (
                <Card 
                  key={challenge.id} 
                  className={`transition-all duration-200 hover:shadow-lg hover:border-brand/50 ${
                    status === 'solved' ? 'border-green-500/30 bg-green-500/5' : 
                    status === 'attempted' ? 'border-yellow-500/30' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getChallengeIcon(status)}
                        <div>
                          <CardTitle className="text-xl">{challenge.title}</CardTitle>
                          <CardDescription>
                            {challenge.description?.substring(0, 150)}...
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          <Badge 
                            variant="outline" 
                            style={{ 
                              backgroundColor: `${getTrackColor(challenge.track)}20`, 
                              borderColor: getTrackColor(challenge.track), 
                              color: getTrackColor(challenge.track) 
                            }}
                          >
                            {challenge.track.toUpperCase()}
                          </Badge>
                          <Badge variant={getDifficultyVariant(challenge.difficulty)}>
                            {challenge.difficulty.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground text-right">
                          <div className="font-mono font-bold text-brand">
                            {formatPoints(challenge.points_base)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {challenge.time_cap_minutes}m
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {challenge.has_lab && (
                          <div className="flex items-center gap-1">
                            <Server className="h-4 w-4" />
                            Lab Available
                          </div>
                        )}
                        {challenge.artifacts_count > 0 && (
                          <div className="flex items-center gap-1">
                            <Download className="h-4 w-4" />
                            {challenge.artifacts_count} artifacts
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {challenge.solve_count || 0} solves
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {status === 'solved' && (
                          <Badge variant="default" className="bg-green-500">
                            SOLVED {challenge.points_awarded && `(${formatPoints(challenge.points_awarded)})`}
                          </Badge>
                        )}
                        {weekStatus !== 'upcoming' ? (
                          <Link href={`/challenges/${challenge.slug}`}>
                            <Button>
                              {status === 'solved' ? 'View Solution' : 'Start Challenge'}
                            </Button>
                          </Link>
                        ) : (
                          <Button disabled>
                            Starts {new Date(week.start_date).toLocaleDateString()}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-16">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">No Challenges Available</CardTitle>
              <CardDescription>
                Challenges for this week will be available soon
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
