'use client'

import { ValidationResult } from '@/types/challenge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ValidationDetailsProps {
  validation: ValidationResult
  onRetry?: () => void
}

export function ValidationDetails({ validation, onRetry }: ValidationDetailsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/80'
    if (score >= 60) return 'bg-yellow-500/80'
    return 'bg-red-500/80'
  }

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const ScoreIndicator = ({ score, label }: { score: number; label: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className={cn('font-medium', getScoreTextColor(score))}>
          {score}/100
        </span>
      </div>
      <Progress 
        value={score} 
        className={cn(
          'h-2 transition-all duration-500',
          getScoreColor(score)
        )} 
      />
    </div>
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn(
            'transition-colors duration-200',
            validation.status === 'passed' ? 'hover:border-green-500/50' : 'hover:border-red-500/50'
          )}
        >
          <Info className="h-4 w-4 mr-2" />
          View Validation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {validation.status === 'passed' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            Validation Results
          </DialogTitle>
          <DialogDescription>
            {validation.validation_type === 'initial' ? 'Initial validation' : 'Post-materialization validation'} 
            completed on {new Date(validation.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Score */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Overall Score</span>
                <span className={cn(
                  'font-bold text-lg',
                  getScoreTextColor(validation.score)
                )}>
                  {validation.score}/100
                </span>
              </div>
              <Progress 
                value={validation.score} 
                className={cn(
                  'h-3 transition-all duration-500',
                  getScoreColor(validation.score)
                )} 
              />
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <span className="font-medium">Feedback</span>
            <p className="text-sm text-muted-foreground leading-relaxed">{validation.feedback}</p>
          </div>

          {/* Detailed Scores */}
          <div className="space-y-4">
            <span className="font-medium">Detailed Scores</span>
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
              <ScoreIndicator 
                score={validation.details.description_clarity} 
                label="Description Clarity" 
              />
              <ScoreIndicator 
                score={validation.details.solution_completeness} 
                label="Solution Completeness" 
              />
              <ScoreIndicator 
                score={validation.details.difficulty_appropriateness} 
                label="Difficulty Appropriateness" 
              />
              <ScoreIndicator 
                score={validation.details.points_fairness} 
                label="Points Fairness" 
              />
              <ScoreIndicator 
                score={validation.details.artifacts_quality} 
                label="Artifacts Quality" 
              />
            </div>
          </div>

          {/* Improvement Suggestions */}
          {validation.details.improvement_suggestions.length > 0 && (
            <div className="space-y-2">
              <span className="font-medium">Improvement Suggestions</span>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                {validation.details.improvement_suggestions.map((suggestion, index) => (
                  <li key={index} className="leading-relaxed">{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer with Retry Button */}
        {validation.status === 'failed' && onRetry && (
          <DialogFooter className="mt-6">
            <Button 
              onClick={onRetry}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Validation
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
