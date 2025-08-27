'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Target } from 'lucide-react'
import { apiGet, getDifficultyColor, getTrackColor, formatTime, formatPoints, getDifficultyVariant } from '@/lib/utils'

interface Challenge {
  id: string
  slug: string
  title: string
  track: string
  difficulty: string
  points_base: number
  time_cap_minutes: number
  mode: string
  description: string
  artifacts: Array<{
    id: string
    filename: string
    kind: string
    size_bytes: number
  }>
  hints: Array<{
    order: number
    cost_percent: number
    available: boolean
  }>
  has_lab: boolean
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTrack, setSelectedTrack] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')

  useEffect(() => {
    fetchChallenges()
  }, [])

  const fetchChallenges = async () => {
    try {
      const response = await apiGet('/api/challenges')
      setChallenges(response.data || [])
    } catch (err: any) {
      setError('Failed to load challenges')
    } finally {
      setLoading(false)
    }
  }

  const filteredChallenges = challenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTrack = selectedTrack === 'all' || challenge.track === selectedTrack
    const matchesDifficulty = selectedDifficulty === 'all' || challenge.difficulty === selectedDifficulty
    
    return matchesSearch && matchesTrack && matchesDifficulty
  })

  const tracks = ['all', 'forensics', 'web', 'crypto', 'pwn', 'reverse', 'misc']
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
        <p className="text-xl text-muted-foreground">
          Defensive Cyberspace Operations Training Scenarios
        </p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-3">
            <label className="text-base font-semibold text-foreground">
              Search
            </label>
            <Input
              type="text"
              placeholder="Search challenges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="space-y-3">
            <label className="text-base font-semibold text-foreground">
              Track
            </label>
            <select 
              className="w-full h-12 rounded-xl border-2 border-border bg-card/50 backdrop-blur-sm px-4 py-3 text-base font-medium text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary hover:border-primary/50"
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
            >
              {tracks.map(track => (
                <option key={track} value={track} className="bg-card text-foreground">
                  {track.charAt(0).toUpperCase() + track.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-3">
            <label className="text-base font-semibold text-foreground">
              Difficulty
            </label>
            <select 
              className="w-full h-12 rounded-xl border-2 border-border bg-card/50 backdrop-blur-sm px-4 py-3 text-base font-medium text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary hover:border-primary/50"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty} className="bg-card text-foreground">
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => {
                setSearchTerm('')
                setSelectedTrack('all')
                setSelectedDifficulty('all')
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
        <div className="terminal-window p-4 border-destructive">
          <div className="text-destructive font-mono">
            ERROR: {error}
          </div>
        </div>
      )}

      {/* Challenge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredChallenges.map((challenge) => (
          <Card key={challenge.id} className="hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <CardTitle className="text-xl font-bold">{challenge.title}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" style={{ backgroundColor: `${getTrackColor(challenge.track)}20`, borderColor: getTrackColor(challenge.track), color: getTrackColor(challenge.track) }}>
                      {challenge.track.toUpperCase()}
                    </Badge>
                    <Badge variant={getDifficultyVariant(challenge.difficulty)}>
                      {challenge.difficulty.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-primary font-bold text-lg">{formatPoints(challenge.points_base)} pts</div>
                  <div className="text-muted-foreground text-base">{formatTime(challenge.time_cap_minutes)}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <CardDescription className="text-base leading-relaxed">
                {challenge.description}
              </CardDescription>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-base">
                  <span className="text-muted-foreground font-medium">Artifacts:</span>
                  <span className="text-primary font-semibold">{challenge.artifacts.length}</span>
                </div>
                
                <div className="flex items-center justify-between text-base">
                  <span className="text-muted-foreground font-medium">Hints:</span>
                  <span className="text-primary font-semibold">{challenge.hints.length}</span>
                </div>
                
                {challenge.has_lab && (
                  <Badge variant="cyber" className="w-fit">
                    LAB AVAILABLE
                  </Badge>
                )}
              </div>
              
              <div className="pt-2">
                <Link href={`/challenges/${challenge.slug}`}>
                  <Button size="lg" className="w-full">
                    START CHALLENGE
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
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
