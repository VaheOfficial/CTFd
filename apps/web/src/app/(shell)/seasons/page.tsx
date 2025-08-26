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

export default function SeasonsPage() {
  const { data: seasons, isLoading, error } = useSeasons()

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

  const activeSeason = seasons.find((season: any) => season.is_active)
  const upcomingSeasons = seasons.filter((season: any) => !season.is_active && new Date(season.start_date) > new Date())
  const pastSeasons = seasons.filter((season: any) => !season.is_active && new Date(season.end_date) < new Date())

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
                    {activeSeason.total_weeks || 8}
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
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Season Progress</span>
                  <span>{Math.round(((activeSeason.current_week || 1) / (activeSeason.total_weeks || 8)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-brand h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${Math.round(((activeSeason.current_week || 1) / (activeSeason.total_weeks || 8)) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="flex gap-4">
                <Link href={`/seasons/${activeSeason.id}`}>
                  <Button className="flex items-center gap-2">
                    View Season
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/leaderboard">
                  <Button variant="outline">
                    View Leaderboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Seasons */}
      {upcomingSeasons.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-400" />
            Upcoming Seasons
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {upcomingSeasons.map((season: any) => (
              <Card key={season.id} className="hover:border-brand/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{season.name}</CardTitle>
                    <Badge variant="outline">
                      {new Date(season.start_date).toLocaleDateString()}
                    </Badge>
                  </div>
                  <CardDescription>
                    {season.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Starts {new Date(season.start_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>{season.total_weeks || 8} weeks</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Seasons */}
      {pastSeasons.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-slate-400" />
            Past Seasons
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pastSeasons.map((season: any) => (
              <Card key={season.id} className="hover:border-slate-600 transition-colors opacity-75">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{season.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      COMPLETED
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {season.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="font-medium">{season.total_challenges || 0}</div>
                      <div className="text-muted-foreground">Challenges</div>
                    </div>
                    <div>
                      <div className="font-medium">{season.total_participants || 0}</div>
                      <div className="text-muted-foreground">Participants</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ended {new Date(season.end_date).toLocaleDateString()}
                  </div>
                  <Link href={`/seasons/${season.id}`}>
                    <Button variant="ghost" size="sm" className="w-full">
                      View Results
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {seasons.length === 0 && (
        <Card>
          <CardContent className="text-center py-16">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">No Seasons Available</CardTitle>
            <CardDescription>
              Check back later for upcoming cybersecurity challenges
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  )
}