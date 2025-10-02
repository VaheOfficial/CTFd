'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'
import { ArrowLeft, Save, Target, Loader2, Info, Clock, Trophy } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const TRACKS = [
  { value: 'INTEL_RECON', label: 'Intel & Recon' },
  { value: 'ACCESS_EXPLOIT', label: 'Access & Exploit' },
  { value: 'IDENTITY_CLOUD', label: 'Identity & Cloud' },
  { value: 'C2_EGRESS', label: 'C2 & Egress' },
  { value: 'DETECT_FORENSICS', label: 'Detect & Forensics' }
]

const DIFFICULTIES = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
  { value: 'INSANE', label: 'Insane' }
]

const MODES = [
  { value: 'solo', label: 'Solo' },
  { value: 'team', label: 'Team' }
]

const STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'READY', label: 'Ready' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' }
]

const FLAG_TYPES = [
  { value: 'static', label: 'Static' },
  { value: 'dynamic_hmac', label: 'Dynamic (HMAC)' }
]

export default function EditChallengePage() {
  const params = useParams()
  const router = useRouter()
  const challengeId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [challenge, setChallenge] = useState({
    title: '',
    slug: '',
    description: '',
    track: 'INTEL_RECON',
    difficulty: 'MEDIUM',
    mode: 'solo',
    status: 'DRAFT',
    points_base: 100,
    time_cap_minutes: 60,
    flag_type: 'dynamic_hmac',
    flag_format: 'flag{{{}}}',
    static_flag: ''
  })

  useEffect(() => {
    loadChallenge()
  }, [challengeId])

  const loadChallenge = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAdminChallenge(challengeId)
      console.log('Challenge response:', response)
      
      if (response.error) {
        toast.error('Failed to load challenge: ' + response.error.message)
        return
      }
      
      if (response.data) {
        setChallenge({
          title: response.data.title || '',
          slug: response.data.slug || '',
          description: response.data.description || '',
          track: response.data.track || 'INTEL_RECON',
          difficulty: response.data.difficulty || 'MEDIUM',
          mode: response.data.mode || 'solo',
          status: response.data.status || 'DRAFT',
          points_base: response.data.points_base || 100,
          time_cap_minutes: response.data.time_cap_minutes || 60,
          flag_type: response.data.flag_type || 'dynamic_hmac',
          flag_format: response.data.flag_format || 'flag{{{}}}',
          static_flag: response.data.static_flag || ''
        })
      }
    } catch (error: any) {
      console.error('Error loading challenge:', error)
      toast.error('Failed to load challenge: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!challenge.title || !challenge.slug) {
      toast.error('Title and slug are required')
      return
    }

    try {
      setSaving(true)
      const response = await apiClient.updateChallenge(challengeId, challenge)
      
      if (response.error) {
        toast.error('Failed to update challenge: ' + response.error.message)
      } else {
        toast.success('Challenge updated successfully')
        router.push('/admin/challenges')
      }
    } catch (error: any) {
      toast.error('Failed to update challenge: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/challenges">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-8 w-8" />
              Edit Challenge
            </h1>
            <p className="text-muted-foreground">Update challenge details and configuration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{challenge.status}</Badge>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Core details about the challenge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={challenge.title}
                onChange={(e) => setChallenge({ ...challenge, title: e.target.value })}
                placeholder="Challenge title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={challenge.slug}
                onChange={(e) => setChallenge({ ...challenge, slug: e.target.value })}
                placeholder="challenge-slug"
              />
              <p className="text-xs text-muted-foreground">URL-friendly identifier</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={challenge.description}
              onChange={(e) => setChallenge({ ...challenge, description: e.target.value })}
              placeholder="Describe the challenge..."
              rows={6}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={challenge.status} 
                onValueChange={(v) => setChallenge({ ...challenge, status: v })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <Select 
                value={challenge.mode} 
                onValueChange={(v) => setChallenge({ ...challenge, mode: v })}
              >
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Challenge Properties
          </CardTitle>
          <CardDescription>Track, difficulty, and scoring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="track">Track</Label>
              <Select 
                value={challenge.track} 
                onValueChange={(v) => setChallenge({ ...challenge, track: v })}
              >
                <SelectTrigger id="track">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRACKS.map((track) => (
                    <SelectItem key={track.value} value={track.value}>
                      {track.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select 
                value={challenge.difficulty} 
                onValueChange={(v) => setChallenge({ ...challenge, difficulty: v })}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((diff) => (
                    <SelectItem key={diff.value} value={diff.value}>
                      {diff.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="points_base">Base Points</Label>
              <Input
                id="points_base"
                type="number"
                min="0"
                value={challenge.points_base}
                onChange={(e) => setChallenge({ ...challenge, points_base: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_cap_minutes" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Time Cap (minutes)
              </Label>
              <Input
                id="time_cap_minutes"
                type="number"
                min="0"
                value={challenge.time_cap_minutes}
                onChange={(e) => setChallenge({ ...challenge, time_cap_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flag Configuration</CardTitle>
          <CardDescription>Configure how flags are validated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="flag_type">Flag Type</Label>
              <Select 
                value={challenge.flag_type} 
                onValueChange={(v) => setChallenge({ ...challenge, flag_type: v })}
              >
                <SelectTrigger id="flag_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLAG_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flag_format">Flag Format</Label>
              <Input
                id="flag_format"
                value={challenge.flag_format}
                onChange={(e) => setChallenge({ ...challenge, flag_format: e.target.value })}
                placeholder="flag{{{}}}"
              />
            </div>
          </div>

          {challenge.flag_type === 'static' && (
            <div className="space-y-2">
              <Label htmlFor="static_flag">Static Flag</Label>
              <Input
                id="static_flag"
                value={challenge.static_flag}
                onChange={(e) => setChallenge({ ...challenge, static_flag: e.target.value })}
                placeholder="Enter the static flag value"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

