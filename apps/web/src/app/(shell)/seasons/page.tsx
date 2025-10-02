'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSeasons } from '@/lib/api/hooks'
import { formatPoints } from '@/lib/utils'
import { 
  Trophy, 
  Calendar, 
  Users, 
  Target, 
  Clock,
  ArrowRight,
  Star
} from 'lucide-react'

type SeasonWithExtras = {
  id: string
  name: string
  start_at: string
  end_at: string
  total_weeks: number
  description: string | null
  theme: string | null
  is_active: boolean
  current_week: number | null
  total_challenges?: number
  total_participants?: number
}

export default function SeasonsPage() {
  const { data: seasons, isLoading, error } = useSeasons()

  // Helper function to calculate days
  const calculateDays = (startAt: string, endAt: string) => {
    const start = new Date(startAt)
    const end = new Date(endAt)
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-slate-700 rounded-2xl"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !seasons) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="text-center py-16">
            <Target className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">Failed to Load Seasons</CardTitle>
            <CardDescription>
              Please try refreshing the page
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  const now = new Date()
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  
  const activeSeason = (seasons as any[]).find((season: any) => season.is_active) as SeasonWithExtras | undefined
  
  // Upcoming: starts within the next 2 weeks
  const upcomingSeasons = (seasons as any[]).filter((season: any) => {
    if (season.is_active) return false
    const startDate = new Date(season.start_at)
    return startDate > now && startDate <= twoWeeksFromNow
  }) as SeasonWithExtras[]
  
  // Past: already ended
  const pastSeasons = ((seasons as any[]).filter((season: any) => {
    if (season.is_active) return false
    const endDate = new Date(season.end_at)
    return endDate < now
  }) as SeasonWithExtras[]).sort((a: SeasonWithExtras, b: SeasonWithExtras) => {
    // Sort by end date, most recent first
    const dateA = new Date(a.end_at)
    const dateB = new Date(b.end_at)
    return dateB.getTime() - dateA.getTime()
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-8 w-8 text-brand" />
          Seasons
        </h1>
        <p className="text-muted-foreground">
          Seasonal cybersecurity challenges and competitions
        </p>
      </div>

      {/* Current Season */}
      {activeSeason && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Current Season
          </h2>
          <Card className="border-brand/50 bg-brand/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{activeSeason.name}</CardTitle>
                  <CardDescription className="text-lg">
                    {activeSeason.description}
                  </CardDescription>
                </div>
                <Badge variant="default" className="text-sm">
                  ACTIVE
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand">
                    Week {activeSeason.current_week || 1}
                  </div>
                  <div className="text-sm text-muted-foreground">Current Week</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {activeSeason.total_weeks}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Weeks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {activeSeason.total_challenges || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Challenges</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {activeSeason.total_participants || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Participants</div>
                </div>
              </div>

              {/* Progress Bar */}
              {(() => {
                const days = calculateDays(activeSeason.start_at, activeSeason.end_at)
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Day {days.elapsed} of {days.total}</span>
                      <span>{days.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-brand h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${days.percentage}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{days.remaining} days remaining</span>
                      <span>Ends {new Date(activeSeason.end_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )
              })()}

              <div className="flex gap-4">
                <Link href={`/seasons/${activeSeason.id}`}>
                  <Button className="flex items-center gap-2">
                    View Season
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Seasons (starting within 2 weeks) */}
      {upcomingSeasons.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-400" />
            Upcoming Seasons
          </h2>
          <div className="space-y-6">
            {upcomingSeasons.map((season) => {
              const startDate = new Date(season.start_at)
              const endDate = new Date(season.end_at)
              const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              
              return (
                <Card key={season.id} className="hover:border-brand/50 transition-colors border-blue-500/30 bg-blue-500/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl">{season.name}</CardTitle>
                        <CardDescription className="text-lg">
                          {season.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-blue-500/10 border-blue-500/50">
                        Starts in {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 gap-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {startDate.toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Start Date</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {endDate.toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">End Date</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {season.total_weeks}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Weeks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {season.total_challenges || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Challenges</div>
                      </div>
                    </div>

                    {season.theme && (
                      <div className="text-sm">
                        <span className="font-medium text-muted-foreground">Theme:</span> {season.theme}
                      </div>
                    )}
                    <div className="mt-4">
                    <Link href={`/seasons/${season.id}`}>
                      <Button className="flex items-center gap-2">
                        View Season
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* No Active or Upcoming Seasons */}
      {!activeSeason && upcomingSeasons.length === 0 && (
        <Card>
          <CardContent className="text-center py-16">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">No Active Seasons</CardTitle>
            <CardDescription>
              There are currently no active or upcoming seasons. Check back later for new cybersecurity challenges!
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Past Seasons */}
      {pastSeasons.length > 0 && (
        <div className="space-y-4 mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-slate-400" />
              Past Seasons
            </h2>
            <Badge variant="outline" className="text-xs">
              {pastSeasons.length} {pastSeasons.length === 1 ? 'Season' : 'Seasons'}
            </Badge>
          </div>
          <div className="space-y-6">
            {pastSeasons.map((season) => {
              const endDate = new Date(season.end_at)
              const startDate = new Date(season.start_at)
              
              return (
                <Card key={season.id} className="hover:border-slate-600 transition-colors opacity-80">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{season.name}</CardTitle>
                        <CardDescription className="text-base">
                          {season.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        COMPLETED
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold">
                          {season.total_challenges || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Challenges</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">
                          {season.total_participants || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Participants</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">
                          {season.total_weeks}
                        </div>
                        <div className="text-sm text-muted-foreground">Weeks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-slate-400">
                          {endDate.toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Ended</div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</span>
                      </div>
                      {season.theme && (
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          <span>{season.theme}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <Link href={`/seasons/${season.id}`}>
                        <Button variant="outline" className="flex items-center gap-2">
                          View Season
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}