'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Target, Lock, Clock } from 'lucide-react'
import { getDifficultyColor, getTrackColor, formatTime, formatPoints, getDifficultyVariant } from '@/lib/utils'
import { useChallenges } from '@/lib/api/hooks'

const tracks = {
  all: 'All Tracks',
  identity_cloud: 'Identity & Cloud',
  intel_recon: 'Intel & Recon',
  c2_egress: 'C2 & Egress',
  access_exploit: 'Access & Exploit',
  detect_forensics: 'Detect & Forensics'
}


export default function ChallengesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTrack, setSelectedTrack] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [currentSeasonOnly, setCurrentSeasonOnly] = useState(false)
  
  const { data: challenges, isLoading: loading, error } = useChallenges({ 
    current_season_only: currentSeasonOnly 
  })

  const filteredChallenges = (challenges || []).filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTrack = selectedTrack === 'all' || challenge.track === selectedTrack
    const matchesDifficulty = selectedDifficulty === 'all' || challenge.difficulty === selectedDifficulty
    
    return matchesSearch && matchesTrack && matchesDifficulty
  })

  const trackKeys = Object.keys(tracks)
  const difficulties = ['all', 'beginner', 'easy', 'medium', 'hard', 'expert']

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-primary mb-4">CHALLENGES</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-primary mb-6 flex items-center justify-center gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/20 shadow-lg">
            <Target className="h-12 w-12 text-primary" />
          </div>
          CHALLENGES
        </h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-secondary/20 via-secondary/15 to-secondary/10 border border-secondary/20">
              <Target className="h-6 w-6 text-secondary" />
            </div>
            <span className="text-xl">Challenge Filters</span>
          </CardTitle>
          <CardDescription className="text-base">
            Filter challenges by search term, track, and difficulty level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="space-y-3">
            <Label htmlFor="search" className="text-base font-semibold">
              Search
            </Label>
            <Input
              id="search"
              type="text"
              placeholder="Search challenges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="track" className="text-base font-semibold">
              Track
            </Label>
            <Select value={selectedTrack} onValueChange={setSelectedTrack}>
              <SelectTrigger id="track">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trackKeys.map(track => (
                  <SelectItem key={track} value={track}>
                    {tracks[track as keyof typeof tracks]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="difficulty" className="text-base font-semibold">
              Difficulty
            </Label>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger id="difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="season-toggle" className="text-base font-semibold">
              Current Season
            </Label>
            <div className="flex items-center h-12 space-x-3">
              <Switch 
                id="season-toggle"
                checked={currentSeasonOnly}
                onCheckedChange={setCurrentSeasonOnly}
              />
              <span className="text-sm text-muted-foreground">
                {currentSeasonOnly ? 'On' : 'Off'}
              </span>
            </div>
          </div>
          
          <div className="flex items-end">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => {
                setSearchTerm('')
                setSelectedTrack('all')
                setSelectedDifficulty('all')
                setCurrentSeasonOnly(false)
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center">
              <Target className="h-16 w-16 text-destructive mx-auto mb-4" />
              <CardTitle className="text-xl mb-2 text-destructive">Failed to Load Challenges</CardTitle>
              <CardDescription>
                {error instanceof Error ? error.message : 'Please try refreshing the page'}
              </CardDescription>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Challenge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChallenges.map((challenge) => {
          const isFuture = (challenge as any).season_status === 'future'
          const isPast = (challenge as any).season_status === 'past'
          
          if (isFuture) {
            return (
              <div key={challenge.id}>
              <Card className={`group relative overflow-hidden transition-all duration-300 h-full border-2 ${
                isFuture 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'hover:shadow-2xl hover:scale-[1.02] cursor-pointer'
              }`}>
                {/* Colored top border */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: getTrackColor(challenge.track) }}
                />
                
                {/* Future/Locked Overlay */}
                {isFuture && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
                      <p className="text-sm font-semibold text-muted-foreground">Available in Future Season</p>
                    </div>
                  </div>
                )}
                
                <CardHeader className="space-y-4 pb-4">
                  {/* Track, Difficulty, and Season Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline"
                        className="font-semibold"
                        style={{ 
                          backgroundColor: `${getTrackColor(challenge.track)}15`,
                          borderColor: getTrackColor(challenge.track),
                          color: getTrackColor(challenge.track)
                        }}
                      >
                        {tracks[challenge.track.toLowerCase() as keyof typeof tracks] || challenge.track}
                      </Badge>
                      {isPast && (
                        <Badge variant="outline" className="font-semibold border-amber-500/50 text-amber-500 bg-amber-500/10">
                          <Clock className="h-3 w-3 mr-1" />
                          EXPIRED
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      variant={getDifficultyVariant(challenge.difficulty)}
                      className="font-semibold"
                    >
                      {challenge.difficulty.toUpperCase()}
                    </Badge>
                  </div>

                {/* Title */}
                <CardTitle className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors">
                  {challenge.title}
                </CardTitle>

                {/* Description */}
                <CardDescription className="text-sm line-clamp-2 min-h-[2.5rem]">
                  {challenge.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 py-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{formatPoints(challenge.points_base)}</div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>
                  <div className="text-center border-x border-border">
                    <div className="text-lg font-semibold">{formatTime(challenge.time_cap_minutes)}</div>
                    <div className="text-xs text-muted-foreground">Time Cap</div>
                  </div>
                  {challenge.has_lab ? (
                    <div className="text-center">
                      <div className="text-lg font-semibold">🧪</div>
                      <div className="text-xs text-muted-foreground">Lab</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-lg font-semibold">{challenge.artifacts.length}</div>
                      <div className="text-xs text-muted-foreground">Files</div>
                    </div>
                  )}
                  
                </div>

                {/* Call to Action */}
                <Button 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" 
                  variant="outline"
                >
                  <span>Start Challenge</span>
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </Button>
              </CardContent>
            </Card>
          </div>
            )
          }
          
          return (
            <Link key={challenge.id} href={`/challenges/${challenge.slug}`}>
              <Card className="group relative overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 h-full cursor-pointer border-2">
                {/* Colored top border */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: getTrackColor(challenge.track) }}
                />
                
                <CardHeader className="space-y-4 pb-4">
                  {/* Track, Difficulty, and Season Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline"
                        className="font-semibold"
                        style={{ 
                          backgroundColor: `${getTrackColor(challenge.track)}15`,
                          borderColor: getTrackColor(challenge.track),
                          color: getTrackColor(challenge.track)
                        }}
                      >
                        {tracks[challenge.track.toLowerCase() as keyof typeof tracks] || challenge.track}
                      </Badge>
                      {isPast && (
                        <Badge variant="outline" className="font-semibold border-amber-500/50 text-amber-500 bg-amber-500/10">
                          <Clock className="h-3 w-3 mr-1" />
                          EXPIRED
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      variant={getDifficultyVariant(challenge.difficulty)}
                      className="font-semibold"
                    >
                      {challenge.difficulty.toUpperCase()}
                    </Badge>
                  </div>

                {/* Title */}
                <CardTitle className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors">
                  {challenge.title}
                </CardTitle>

                {/* Description */}
                <CardDescription className="text-sm line-clamp-2 min-h-[2.5rem]">
                  {challenge.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 py-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{formatPoints(challenge.points_base)}</div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>
                  <div className="text-center border-x border-border">
                    <div className="text-lg font-semibold">{formatTime(challenge.time_cap_minutes)}</div>
                    <div className="text-xs text-muted-foreground">Time Cap</div>
                  </div>
                  {challenge.has_lab ? (
                    <div className="text-center">
                      <div className="text-lg font-semibold">🧪</div>
                      <div className="text-xs text-muted-foreground">Lab</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-lg font-semibold">{challenge.artifacts.length}</div>
                      <div className="text-xs text-muted-foreground">Files</div>
                    </div>
                  )}
                  
                </div>

                {/* Call to Action */}
                <Button 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" 
                  variant="outline"
                >
                  <span>Start Challenge</span>
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </Button>
              </CardContent>
            </Card>
          </Link>
            )
        })}
      </div>

      {filteredChallenges.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-muted-foreground font-mono">
            No challenges found matching your filters.
          </div>
        </div>
      )}
    </div>
  )
}
