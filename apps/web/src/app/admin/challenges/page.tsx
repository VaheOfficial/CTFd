'use client'

import { useState } from 'react'
import { Challenge } from '@/types/challenge'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useChallenges, useCreateChallenge, useRetryValidation } from '@/lib/api/hooks'
import { formatPoints, getDifficultyVariant, getTrackColor } from '@/lib/utils'
import { 
  Target, 
  Plus, 
  Search, 
  Filter,
  Edit, 
  Eye,
  Upload,
  Download,
  Trash2,
  Settings,
  Clock,
  Trophy,
  Users,
  CheckCircle,
  AlertCircle,
  FileText,
  Info,
  RefreshCw
} from 'lucide-react'
import { ValidationDetails } from '@/components/validation-details'

export default function AdminChallengesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [trackFilter, setTrackFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  
  const { data: challenges = [], isLoading } = useChallenges() as unknown as { data: Challenge[], isLoading: boolean }
  const retryValidation = useRetryValidation()
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'draft':
        return <Edit className="h-4 w-4 text-yellow-400" />
      case 'archived':
        return <AlertCircle className="h-4 w-4 text-slate-400" />
      case 'validation_pending':
        return <Clock className="h-4 w-4 text-blue-400 animate-spin" />
      case 'validation_failed':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'ready_for_materialization':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'materialization_pending':
        return <Clock className="h-4 w-4 text-blue-400 animate-spin" />
      case 'materialization_failed':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'ready_for_publishing':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      default:
        return <FileText className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return <Badge variant="default">PUBLISHED</Badge>
      case 'draft':
        return <Badge variant="warning">DRAFT</Badge>
      case 'archived':
        return <Badge variant="outline">ARCHIVED</Badge>
      case 'validation_pending':
        return <Badge variant="secondary" className="animate-pulse">VALIDATING</Badge>
      case 'validation_failed':
        return <Badge variant="destructive">VALIDATION FAILED</Badge>
      case 'ready_for_materialization':
        return <Badge variant="default">READY FOR MATERIALIZATION</Badge>
      case 'materialization_pending':
        return <Badge variant="secondary" className="animate-pulse">MATERIALIZING</Badge>
      case 'materialization_failed':
        return <Badge variant="destructive">MATERIALIZATION FAILED</Badge>
      case 'ready_for_publishing':
        return <Badge variant="default">READY FOR PUBLISHING</Badge>
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>
    }
  }

  const filteredChallenges = challenges.filter(challenge => {
    console.log(`challenge: ${JSON.stringify(challenge)}`)
    const matchesSearch = !searchQuery || 
      challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      challenge.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || challenge.status.toLowerCase() === statusFilter
    const matchesTrack = trackFilter === 'all' || challenge.track === trackFilter
    const matchesDifficulty = difficultyFilter === 'all' || challenge.difficulty === difficultyFilter

    return matchesSearch && matchesStatus && matchesTrack && matchesDifficulty
  })

  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 py-8 px-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-8 w-8 text-brand" />
            Challenge Management
          </h1>
          <p className="text-muted-foreground">
            Manage your challenge library and create new challenges
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Link href="/admin/ai">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              AI Generator
            </Button>
          </Link>
          <Link href="/admin/challenges/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>
            Filter and search through your challenge library
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search challenges..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="validation_pending">Validating</SelectItem>
                  <SelectItem value="validation_failed">Validation Failed</SelectItem>
                  <SelectItem value="ready_for_materialization">Ready for Materialization</SelectItem>
                  <SelectItem value="materialization_pending">Materializing</SelectItem>
                  <SelectItem value="materialization_failed">Materialization Failed</SelectItem>
                  <SelectItem value="ready_for_publishing">Ready for Publishing</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Track</label>
              <Select value={trackFilter} onValueChange={setTrackFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tracks</SelectItem>
                  <SelectItem value="INTEL_RECON">Intel & Recon</SelectItem>
                  <SelectItem value="ACCESS_EXPLOIT">Access & Exploit</SelectItem>
                  <SelectItem value="IDENTITY_CLOUD">Identity & Cloud</SelectItem>
                  <SelectItem value="C2_EGRESS">C2 & Egress</SelectItem>
                  <SelectItem value="DETECT_FORENSICS">Detect & Forensics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                  <SelectItem value="INSANE">Insane</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Challenge Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Challenges</CardTitle>
            <Target className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredChallenges.length}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredChallenges.filter((c: any) => c.status === 'published').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Live challenges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Edit className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredChallenges.filter((c: any) => c.status === 'draft').length}
            </div>
            <p className="text-xs text-muted-foreground">
              In development
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Solve Rate</CardTitle>
            <Trophy className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67%</div>
            <p className="text-xs text-muted-foreground">
              Success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Challenges List */}
      <div className="space-y-4">
        {filteredChallenges.length > 0 ? (
          filteredChallenges.map((challenge: Challenge) => (
            <Card key={challenge.id} className="hover:border-brand/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(challenge.status)}
                    <div>
                      <CardTitle className="text-xl">{challenge.title}</CardTitle>
                      <CardDescription>
                        {challenge.description?.substring(0, 120)}...
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(challenge.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
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
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Trophy className="h-4 w-4" />
                      <span>{formatPoints(challenge.points_base)}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{challenge.time_cap_minutes}m</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{challenge.solve_count || 0} solves</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {challenge.latest_validation && (
                      <ValidationDetails 
                        validation={challenge.latest_validation}
                        onRetry={challenge.status === 'VALIDATION_FAILED' ? () => {
                          retryValidation.mutate({
                            challengeId: challenge.id,
                            validationType: challenge.latest_validation?.validation_type || 'initial'
                          })
                        } : undefined}
                      />
                    )}
                    <Link href={`/challenges/${challenge.slug}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                    </Link>
                    <Link href={`/admin/challenges/${challenge.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-16">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">No Challenges Found</CardTitle>
              <CardDescription className="mb-6">
                {searchQuery || statusFilter !== 'all' || trackFilter !== 'all' || difficultyFilter !== 'all'
                  ? 'Try adjusting your filters to see more challenges'
                  : 'Create your first challenge to get started'
                }
              </CardDescription>
              {!(searchQuery || statusFilter !== 'all' || trackFilter !== 'all' || difficultyFilter !== 'all') && (
                <div className="flex items-center justify-center space-x-2">
                  <Link href="/admin/ai">
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Use AI Generator
                    </Button>
                  </Link>
                  <Link href="/admin/challenges/create">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Challenge
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
