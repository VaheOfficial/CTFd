'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useChallenge, useChallengeInstance, useSubmitFlag, useConsumeHint } from '@/lib/api/hooks'
import { formatTime, formatPoints, getDifficultyVariant, getTrackColor } from '@/lib/utils'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { 
  Download, 
  Clock, 
  Trophy, 
  Target, 
  Lightbulb, 
  Server, 
  Play, 
  Square, 
  Flag,
  FileText,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Timer,
  Award,
  Users,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'

export default function ChallengePage() {
  const params = useParams()
  const slug = params.slug as string
  
  const { data: challenge, isLoading, error } = useChallenge(slug)
  const createInstanceMutation = useChallengeInstance(challenge?.id || '')
  const submitFlagMutation = useSubmitFlag(challenge?.id || '')
  const consumeHintMutation = useConsumeHint(challenge?.id || '')
  
  const [flagInput, setFlagInput] = useState('')
  const [showHints, setShowHints] = useState(false)
  const [consumedHints, setConsumedHints] = useState<number[]>([])
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([])
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const handleSubmitFlag = async () => {
    if (!flagInput.trim() || !challenge) return
    
    try {
      const result = await submitFlagMutation.mutateAsync({ flag: flagInput.trim() })
      
      // Add to submission history
      setSubmissionHistory(prev => [{
        flag: flagInput.trim(),
        is_correct: (result as any)?.is_correct,
        points_awarded: (result as any)?.points_awarded,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 4)]) // Keep last 5 submissions
      
      if ((result as any)?.is_correct) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
        toast.success(`Correct! You earned ${formatPoints((result as any)?.points_awarded || 0)} points!`)
      } else {
        toast.error('Incorrect flag. Try again!')
      }
      
      setFlagInput('')
    } catch (error) {
      toast.error('Failed to submit flag')
    }
  }

  // Timer effect for time-capped challenges
  useEffect(() => {
    if (challenge?.time_cap_minutes && challenge?.started_at) {
      const startTime = new Date(challenge.started_at).getTime()
      const timeLimit = challenge.time_cap_minutes * 60 * 1000
      
      const timer = setInterval(() => {
        const now = Date.now()
        const elapsed = now - startTime
        const remaining = Math.max(0, timeLimit - elapsed)
        
        setTimeRemaining(remaining)
        
        if (remaining === 0) {
          clearInterval(timer)
          toast.warning('Time limit reached!')
        }
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [challenge])

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleConsumeHint = async (hintOrder: number) => {
    if (!challenge) return
    
    try {
      await consumeHintMutation.mutateAsync({ hintOrder })
      setConsumedHints(prev => [...prev, hintOrder])
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  }

  const handleCreateInstance = async () => {
    if (!challenge) return
    
    try {
      await createInstanceMutation.mutateAsync()
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

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

  if (error || !challenge) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="text-center py-16">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">Challenge Not Found</CardTitle>
            <CardDescription>
              The requested challenge could not be loaded.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8 relative">
        {/* Confetti Effect */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-lime-500/20 animate-pulse" />
          </div>
        )}
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{challenge.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" style={{ 
              backgroundColor: `${getTrackColor(challenge.track)}20`, 
              borderColor: getTrackColor(challenge.track), 
              color: getTrackColor(challenge.track) 
            }}>
              {challenge.track.toUpperCase()}
            </Badge>
            <Badge variant={getDifficultyVariant(challenge.difficulty)}>
              {challenge.difficulty.toUpperCase()}
            </Badge>
            {challenge.has_lab && (
              <Badge variant="secondary">LAB AVAILABLE</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-brand" />
            <span>{formatPoints(challenge.points_base)} points</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatTime(challenge.time_cap_minutes)} time cap</span>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 xl:grid-cols-4">
        {/* Main Content - spans more columns on larger screens */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-6">

          {/* Challenge Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand" />
                Challenge Brief
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {challenge.description}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Artifacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-brand" />
                Artifacts ({challenge.artifacts.length})
              </CardTitle>
              <CardDescription>
                Download the files needed to solve this challenge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {challenge.artifacts.map((artifact: any) => (
                  <div key={artifact.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex-1">
                      <p className="font-medium">{artifact.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {artifact.kind} • {formatFileSize(artifact.size_bytes)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hints */}
          {challenge.hints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-400" />
                    Hints ({challenge.hints.length})
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHints(!showHints)}
                  >
                    {showHints ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showHints ? 'Hide' : 'Show'}
                  </Button>
                </CardTitle>
                <CardDescription>
                  Get help solving this challenge (points will be deducted)
                </CardDescription>
              </CardHeader>
              {showHints && (
                <CardContent>
                  <div className="space-y-3">
                    {challenge.hints.map((hint: any) => (
                      <div key={hint.order} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Hint #{hint.order}</p>
                            <p className="text-sm text-muted-foreground">
                              Cost: {hint.cost_percent}% of points ({Math.floor(challenge.points_base * hint.cost_percent / 100)} points)
                            </p>
                          </div>
                          {consumedHints.includes(hint.order) ? (
                            <div className="flex items-center gap-2 text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Consumed</span>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConsumeHint(hint.order)}
                              disabled={consumeHintMutation.isPending}
                            >
                              Consume Hint
                            </Button>
                          )}
                        </div>
                        {consumedHints.includes(hint.order) && (
                          <div className="mt-3 p-2 rounded bg-slate-700/50">
                            <p className="text-sm">
                              [Hint content would be shown here after consumption]
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar - better mobile spacing */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Timer (if time-capped) */}
          {timeRemaining !== null && (
            <Card className={`${timeRemaining < 300000 ? 'border-red-500/50 bg-red-500/5' : 'border-brand/50'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className={`h-5 w-5 ${timeRemaining < 300000 ? 'text-red-400' : 'text-brand'}`} />
                  Time Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-mono font-bold ${timeRemaining < 300000 ? 'text-red-400' : 'text-brand'}`}>
                  {formatTimeRemaining(timeRemaining)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {timeRemaining < 300000 ? 'Hurry up!' : 'Keep going!'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Flag */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-brand" />
                Submit Flag
              </CardTitle>
              <CardDescription>
                Found the answer? Submit your flag here
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="CTE{your_flag_here}"
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitFlag()}
                disabled={submitFlagMutation.isPending}
              />
              <Button 
                onClick={handleSubmitFlag}
                disabled={!flagInput.trim() || submitFlagMutation.isPending || timeRemaining === 0}
                className="w-full"
              >
                {submitFlagMutation.isPending ? 'Submitting...' : 'Submit Flag'}
              </Button>
              
              {/* Submission History */}
              {submissionHistory.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-xs text-muted-foreground">Recent Submissions</Label>
                  <div className="space-y-1">
                    {submissionHistory.map((submission, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-slate-800/30">
                        <span className="font-mono truncate flex-1 mr-2">
                          {submission.flag.substring(0, 20)}...
                        </span>
                        {submission.is_correct ? (
                          <CheckCircle className="h-3 w-3 text-green-400" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-red-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Challenge Instance */}
          {challenge.mode === 'dynamic' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-brand" />
                  Challenge Instance
                </CardTitle>
                <CardDescription>
                  Create your personal instance for this challenge
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleCreateInstance}
                  disabled={createInstanceMutation.isPending}
                  className="w-full"
                >
                  {createInstanceMutation.isPending ? 'Creating...' : 'Create Instance'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Lab Environment */}
          {challenge.has_lab && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-400" />
                  Lab Environment
                </CardTitle>
                <CardDescription>
                  Start a lab environment for hands-on analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Start Lab
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Square className="h-4 w-4 mr-2" />
                    Stop Lab
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Status: <span className="text-slate-400">Not started</span></p>
                  <p>TTL: <span className="text-slate-400">--:--</span></p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Challenge Info */}
          <Card>
            <CardHeader>
              <CardTitle>Challenge Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Mode</p>
                  <p className="font-medium">{challenge.mode}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Solves</p>
                  <p className="font-medium">42</p>
                </div>
                <div>
                  <p className="text-muted-foreground">First Blood</p>
                  <p className="font-medium">hacker123</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Success Rate</p>
                  <p className="font-medium">67%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  )
}