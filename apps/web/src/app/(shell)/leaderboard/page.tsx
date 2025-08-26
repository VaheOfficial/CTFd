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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-8 w-8 text-brand" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground">
          Top performers in defensive cybersecurity challenges
        </p>
      </div>

      {/* Season Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Season Selection
          </CardTitle>
          <CardDescription>
            Choose a season to view its leaderboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-full max-w-xs">
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
                <div>
                  <CardTitle>{activeSeason.name}</CardTitle>
                  <CardDescription>
                    {activeSeason.is_active ? 'Current Season' : 'Completed Season'}
                  </CardDescription>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="text-center">
                    <div className="text-lg font-bold text-brand">
                      {leaderboard?.total_participants || 0}
                    </div>
                    <div>Participants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      Week {activeSeason.current_week || 1}
                    </div>
                    <div>Current Week</div>
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
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-400" />
                      Top 3 Champions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {/* 2nd Place */}
                      <div className="order-1 text-center">
                        <div className="bg-slate-400/20 rounded-2xl p-4 border border-slate-400/40">
                          <Medal className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                          <h3 className="font-bold text-lg">{leaderboard.entries[1]?.username}</h3>
                          <p className="text-lg font-mono text-slate-400">
                            {formatPoints(leaderboard.entries[1]?.total_points || 0)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {leaderboard.entries[1]?.challenges_solved} challenges
                          </p>
                        </div>
                      </div>

                      {/* 1st Place */}
                      <div className="order-2 text-center">
                        <div className="bg-yellow-400/20 rounded-2xl p-6 border border-yellow-400/40 transform scale-105">
                          <Crown className="h-10 w-10 text-yellow-400 mx-auto mb-2" />
                          <h3 className="font-bold text-xl">{leaderboard.entries[0]?.username}</h3>
                          <p className="text-xl font-mono text-yellow-400">
                            {formatPoints(leaderboard.entries[0]?.total_points || 0)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {leaderboard.entries[0]?.challenges_solved} challenges
                          </p>
                          <Badge variant="default" className="mt-2">Champion</Badge>
                        </div>
                      </div>

                      {/* 3rd Place */}
                      <div className="order-3 text-center">
                        <div className="bg-amber-600/20 rounded-2xl p-4 border border-amber-600/40">
                          <Award className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                          <h3 className="font-bold text-lg">{leaderboard.entries[2]?.username}</h3>
                          <p className="text-lg font-mono text-amber-600">
                            {formatPoints(leaderboard.entries[2]?.total_points || 0)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {leaderboard.entries[2]?.challenges_solved} challenges
                          </p>
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
                                  <Badge variant="terminal" className="text-xs">YOU</Badge>
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