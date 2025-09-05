'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, Trophy, FileText, HelpCircle, CheckCircle, AlertCircle } from 'lucide-react'
import { formatPoints, getDifficultyVariant, getTrackColor } from '@/lib/utils'

interface PreviewStepProps {
  data: any
}

export function PreviewStep({ data }: PreviewStepProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{data.title}</CardTitle>
              <CardDescription>
                {data.slug}
              </CardDescription>
            </div>
            <Badge variant="outline">DRAFT</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <Badge 
              variant="outline" 
              style={{ 
                backgroundColor: `${getTrackColor(data.track)}20`, 
                borderColor: getTrackColor(data.track), 
                color: getTrackColor(data.track) 
              }}
            >
              {data.track}
            </Badge>
            <Badge variant={getDifficultyVariant(data.difficulty)}>
              {data.difficulty}
            </Badge>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span>{formatPoints(data.points_base)}</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{data.time_cap_minutes}m</span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <div className="prose prose-invert max-w-none">
                {data.description}
              </div>
            </div>

            {data.artifacts?.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Artifacts</h3>
                  <div className="space-y-2">
                    {data.artifacts.map((artifact: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-md border">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{artifact.original_filename}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Badge variant="secondary">{artifact.kind}</Badge>
                          <span>{formatFileSize(artifact.size_bytes)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {data.hints?.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Hints</h3>
                  <div className="space-y-2">
                    {data.hints.map((hint: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-md border">
                        <div className="flex items-center space-x-2">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          <span>Hint {index + 1}</span>
                        </div>
                        <Badge variant="secondary">-{hint.cost_percent}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2">Validation</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {data.validator.type === 'builtin' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>
                    {data.validator.type === 'builtin' ? 'Built-in Validator' : 'Container Validator'}
                  </span>
                </div>

                {data.validator.type === 'container' && (
                  <div className="space-y-2 pl-7">
                    <div>
                      <span className="text-sm text-muted-foreground">Image:</span>
                      <span className="ml-2">{data.validator.image}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Command:</span>
                      <span className="ml-2">{data.validator.command?.join(' ')}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Network Policy:</span>
                      <span className="ml-2">{data.validator.network_policy}</span>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-sm text-muted-foreground">Timeout:</span>
                  <span className="ml-2">{data.validator.timeout_sec} seconds</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-brand/5 border-brand/20">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-brand" />
            <p className="text-sm text-brand">
              This is a preview of how your challenge will appear. Review all details before creating.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}