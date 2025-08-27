'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSeasons, useLeaderboard } from '@/lib/api/hooks'
import { formatPoints } from '@/lib/utils'
import { 
  Trophy, 
  Medal, 
  Award, 
  Users, 
  TrendingUp,
  Crown,
  Target,
  Calendar
} from 'lucide-react'

export default function LeaderboardPage() {
  const { data: seasons } = useSeasons()
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  
  // Get current season if no season selected
  const currentSeason = seasons?.find(season => season.is_active)
  const activeSeason = selectedSeasonId ? seasons?.find(s => s.id === selectedSeasonId) : currentSeason
  
  const { data: leaderboard, isLoading } = useLeaderboard(
    activeSeason?.id || '', 
    100, // Show top 100
    false
  )

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
    <div className="space-y-10 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-primary mb-6 flex items-center justify-center gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20 shadow-lg">
            <Trophy className="h-12 w-12 text-primary" />
          </div>
          LEADERBOARD
        </h1>
        <p className="text-xl text-muted-foreground">
          Top Performers in Defensive Cybersecurity Challenges
        </p>
      </div>

      {/* Season Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-secondary/20 via-secondary/15 to-secondary/10 border border-secondary/20">
              <Calendar className="h-6 w-6 text-secondary" />
            </div>
            <span className="text-xl">Season Selection</span>
          </CardTitle>
          <CardDescription className="text-base">
            Choose a season to view its leaderboard rankings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a season" />
            </SelectTrigger>
            <SelectContent>
              {seasons?.map((season: any) => (
                <SelectItem key={season.id} value={season.id}>
                  {season.name} {season.is_active && '(Current)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {activeSeason && (
        <>
          {/* Season Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{activeSeason.name}</CardTitle>
                  <CardDescription className="text-base">
                    {activeSeason.is_active ? 'Current Season' : 'Completed Season'}
                  </CardDescription>
                </div>
                <div className="flex gap-6 text-base">
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                    <div className="text-2xl font-bold text-primary">
                      {leaderboard?.total_participants || 0}
                    </div>
                    <div className="text-muted-foreground font-medium">Participants</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent border border-secondary/20">
                    <div className="text-2xl font-bold text-secondary">
                      Week {activeSeason.current_week || 1}
                    </div>
                    <div className="text-muted-foreground font-medium">Current Week</div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Leaderboard Tabs */}
          <Tabs defaultValue="overall" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overall">Overall Ranking</TabsTrigger>
              <TabsTrigger value="weekly">This Week</TabsTrigger>
            </TabsList>

            <TabsContent value="overall" className="space-y-6">
              {/* Top 3 Podium */}
              {leaderboard?.entries && leaderboard.entries.length >= 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 via-yellow-500/15 to-yellow-500/10 border border-yellow-500/30">
                        <Crown className="h-6 w-6 text-yellow-400" />
                      </div>
                      <span className="text-xl">Top 3 Champions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-6">
                      {/* 2nd Place */}
                      <div className="order-1 text-center">
                        <div className="bg-gradient-to-br from-slate-500/20 via-slate-500/15 to-slate-500/10 rounded-2xl p-6 border border-slate-500/30 shadow-lg">
                          <Medal className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                          <h3 className="font-bold text-xl">{leaderboard.entries[1]?.username}</h3>
                          <p className="text-xl font-bold text-slate-400 mb-2">
                            {formatPoints(leaderboard.entries[1]?.total_points || 0)}
                          </p>
                          <p className="text-base text-muted-foreground">
                            {leaderboard.entries[1]?.challenges_solved} challenges
                          </p>
                          <Badge variant="secondary" className="mt-3">2nd Place</Badge>
                        </div>
                      </div>

                      {/* 1st Place */}
                      <div className="order-2 text-center">
                        <div className="bg-gradient-to-br from-yellow-500/20 via-yellow-500/15 to-yellow-500/10 rounded-2xl p-8 border border-yellow-500/30 transform scale-105 shadow-2xl">
                          <Crown className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                          <h3 className="font-bold text-2xl">{leaderboard.entries[0]?.username}</h3>
                          <p className="text-2xl font-bold text-yellow-400 mb-3">
                            {formatPoints(leaderboard.entries[0]?.total_points || 0)}
                          </p>
                          <p className="text-base text-muted-foreground mb-3">
                            {leaderboard.entries[0]?.challenges_solved} challenges
                          </p>
                          <Badge variant="default" className="text-base px-4 py-2">Champion</Badge>
                        </div>
                      </div>

                      {/* 3rd Place */}
                      <div className="order-3 text-center">
                        <div className="bg-gradient-to-br from-amber-600/20 via-amber-600/15 to-amber-600/10 rounded-2xl p-6 border border-amber-600/30 shadow-lg">
                          <Award className="h-10 w-10 text-amber-600 mx-auto mb-3" />
                          <h3 className="font-bold text-xl">{leaderboard.entries[2]?.username}</h3>
                          <p className="text-xl font-bold text-amber-600 mb-2">
                            {formatPoints(leaderboard.entries[2]?.total_points || 0)}
                          </p>
                          <p className="text-base text-muted-foreground">
                            {leaderboard.entries[2]?.challenges_solved} challenges
                          </p>
                          <Badge variant="warning" className="mt-3">3rd Place</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Full Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand" />
                    Full Rankings
                  </CardTitle>
                  <CardDescription>
                    Complete leaderboard for {activeSeason.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center space-x-4 p-3">
                          <div className="w-8 h-4 bg-slate-700 rounded"></div>
                          <div className="flex-1 h-4 bg-slate-700 rounded"></div>
                          <div className="w-16 h-4 bg-slate-700 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard?.entries?.map((entry: any) => (
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weekly" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-brand" />
                    This Week's Progress
                  </CardTitle>
                  <CardDescription>
                    Weekly leaderboard and recent activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Weekly rankings coming soon
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!activeSeason && (
        <Card>
          <CardContent className="text-center py-16">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">No Season Selected</CardTitle>
            <CardDescription>
              Select a season to view its leaderboard
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  )
}