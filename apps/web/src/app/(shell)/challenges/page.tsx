'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
      // For now, we'll create mock data since the API endpoint returns individual challenges
      // In a real implementation, you'd have a /api/challenges endpoint that returns all challenges
      const mockChallenges: Challenge[] = [
        {
          id: '1',
          slug: 'network-forensics-101',
          title: 'Network Forensics 101',
          track: 'forensics',
          difficulty: 'beginner',
          points_base: 100,
          time_cap_minutes: 30,
          mode: 'standard',
          description: 'Analyze network traffic to identify suspicious activity and extract indicators of compromise.',
          artifacts: [
            { id: '1', filename: 'traffic.pcap', kind: 'pcap', size_bytes: 2048576 },
            { id: '2', filename: 'baseline.txt', kind: 'text', size_bytes: 1024 }
          ],
          hints: [
            { order: 1, cost_percent: 10, available: true },
            { order: 2, cost_percent: 25, available: true }
          ],
          has_lab: false
        },
        {
          id: '2',
          slug: 'malware-analysis-basics',
          title: 'Malware Analysis Basics',
          track: 'reverse',
          difficulty: 'easy',
          points_base: 150,
          time_cap_minutes: 45,
          mode: 'standard',
          description: 'Analyze a malware sample to understand its behavior and extract configuration data.',
          artifacts: [
            { id: '3', filename: 'sample.exe', kind: 'binary', size_bytes: 512000 },
            { id: '4', filename: 'strings.txt', kind: 'text', size_bytes: 4096 }
          ],
          hints: [
            { order: 1, cost_percent: 15, available: true }
          ],
          has_lab: true
        },
        {
          id: '3',
          slug: 'log-analysis-incident',
          title: 'Log Analysis: Security Incident',
          track: 'forensics',
          difficulty: 'medium',
          points_base: 250,
          time_cap_minutes: 60,
          mode: 'standard',
          description: 'Investigate system logs to reconstruct a security incident timeline and identify the attack vector.',
          artifacts: [
            { id: '5', filename: 'auth.log', kind: 'log', size_bytes: 1048576 },
            { id: '6', filename: 'access.log', kind: 'log', size_bytes: 2097152 },
            { id: '7', filename: 'syslog', kind: 'log', size_bytes: 4194304 }
          ],
          hints: [
            { order: 1, cost_percent: 20, available: true },
            { order: 2, cost_percent: 35, available: true }
          ],
          has_lab: false
        }
      ]
      setChallenges(mockChallenges)
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
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-primary mb-4">CHALLENGES</h1>
        <p className="text-muted-foreground font-mono">
          Defensive cyber operations training scenarios
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-mono text-primary uppercase tracking-wider mb-2 block">
              Search
            </label>
            <Input
              type="text"
              placeholder="Search challenges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="text-sm font-mono text-primary uppercase tracking-wider mb-2 block">
              Track
            </label>
            <select 
              className="w-full h-10 rounded-md border border-input bg-input px-3 py-2 text-sm font-mono text-primary"
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
          
          <div>
            <label className="text-sm font-mono text-primary uppercase tracking-wider mb-2 block">
              Difficulty
            </label>
            <select 
              className="w-full h-10 rounded-md border border-input bg-input px-3 py-2 text-sm font-mono text-primary"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChallenges.map((challenge) => (
          <Card key={challenge.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{challenge.title}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" style={{ backgroundColor: `${getTrackColor(challenge.track)}20`, borderColor: getTrackColor(challenge.track), color: getTrackColor(challenge.track) }}>
                      {challenge.track.toUpperCase()}
                    </Badge>
                    <Badge variant={getDifficultyVariant(challenge.difficulty)}>
                      {challenge.difficulty.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="text-right font-mono text-sm">
                  <div className="text-primary font-bold">{formatPoints(challenge.points_base)} pts</div>
                  <div className="text-muted-foreground">{formatTime(challenge.time_cap_minutes)}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                {challenge.description}
              </CardDescription>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-mono">
                  <span className="text-muted-foreground">Artifacts:</span>
                  <span className="text-primary">{challenge.artifacts.length}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm font-mono">
                  <span className="text-muted-foreground">Hints:</span>
                  <span className="text-primary">{challenge.hints.length}</span>
                </div>
                
                {challenge.has_lab && (
                  <Badge variant="outline" className="text-xs">
                    LAB AVAILABLE
                  </Badge>
                )}
              </div>
              
              <div className="mt-4">
                <Link href={`/challenges/${challenge.slug}`}>
                  <Button className="w-full">
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
