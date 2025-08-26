'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useGenerateChallenge, useMaterializeChallenge, usePublishChallenge, useSeasons } from '@/lib/api/hooks'
import { 
  Bot, 
  Zap, 
  FileText, 
  Upload, 
  CheckCircle, 
  ArrowRight, 
  Sparkles,
  Settings,
  Eye,
  Code,
  AlertCircle,
  Download,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'

interface GeneratedChallenge {
  id: string
  title: string
  description: string
  track: string
  difficulty: string
  points_base: number
  time_cap_minutes: number
  artifacts: Array<{
    filename: string
    content: string
    kind: string
  }>
  hints: Array<{
    order: number
    content: string
    cost_percent: number
  }>
  validator: {
    type: string
    config: any
  }
}

export default function AdminAIPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [prompt, setPrompt] = useState('')
  const [generatedChallenge, setGeneratedChallenge] = useState<GeneratedChallenge | null>(null)
  const [selectedSeason, setSelectedSeason] = useState('')
  const [selectedWeek, setSelectedWeek] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isMaterializing, setIsMaterializing] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [materializedArtifacts, setMaterializedArtifacts] = useState<any[]>([])

  const { data: seasons } = useSeasons()
  const generateMutation = useGenerateChallenge()
  const materializeMutation = useMaterializeChallenge()
  const publishMutation = usePublishChallenge()

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a challenge prompt')
      return
    }

    setIsGenerating(true)
    try {
      const result = await generateMutation.mutateAsync({ prompt })
      setGeneratedChallenge(result as any)
      setCurrentStep(2)
      toast.success('Challenge generated successfully!')
    } catch (error) {
      toast.error('Failed to generate challenge')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMaterialize = async () => {
    if (!generatedChallenge) return

    setIsMaterializing(true)
    try {
      const result = await materializeMutation.mutateAsync({ 
        challengeId: generatedChallenge.id 
      })
      setMaterializedArtifacts(result as any)
      setCurrentStep(3)
      toast.success('Challenge artifacts materialized!')
    } catch (error) {
      toast.error('Failed to materialize challenge')
    } finally {
      setIsMaterializing(false)
    }
  }

  const handlePublish = async () => {
    if (!generatedChallenge || !selectedSeason) {
      toast.error('Please select a season and week')
      return
    }

    setIsPublishing(true)
    try {
      await publishMutation.mutateAsync({
        challengeId: generatedChallenge.id,
        seasonId: selectedSeason,
        weekIndex: selectedWeek ? parseInt(selectedWeek) : undefined
      })
      toast.success('Challenge published successfully!')
      // Reset form
      setCurrentStep(1)
      setPrompt('')
      setGeneratedChallenge(null)
      setMaterializedArtifacts([])
      setSelectedSeason('')
      setSelectedWeek('')
    } catch (error) {
      toast.error('Failed to publish challenge')
    } finally {
      setIsPublishing(false)
    }
  }

  const getStepIcon = (step: number) => {
    if (step < currentStep) return <CheckCircle className="h-5 w-5 text-green-400" />
    if (step === currentStep) return <div className="h-5 w-5 rounded-full bg-brand" />
    return <div className="h-5 w-5 rounded-full bg-slate-600" />
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-8 w-8 text-brand" />
          AI Challenge Generator
        </h1>
        <p className="text-muted-foreground">
          Create professional cybersecurity challenges using AI assistance
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStepIcon(1)}
              <div>
                <h3 className="font-medium">Generate</h3>
                <p className="text-sm text-muted-foreground">Create challenge from prompt</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center space-x-4">
              {getStepIcon(2)}
              <div>
                <h3 className="font-medium">Materialize</h3>
                <p className="text-sm text-muted-foreground">Generate artifacts and files</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center space-x-4">
              {getStepIcon(3)}
              <div>
                <h3 className="font-medium">Publish</h3>
                <p className="text-sm text-muted-foreground">Deploy to season</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={currentStep.toString()} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="1" disabled={currentStep < 1}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="2" disabled={currentStep < 2}>
            <Settings className="h-4 w-4 mr-2" />
            Materialize
          </TabsTrigger>
          <TabsTrigger value="3" disabled={currentStep < 3}>
            <Upload className="h-4 w-4 mr-2" />
            Publish
          </TabsTrigger>
        </TabsList>

        {/* Step 1: Generate */}
        <TabsContent value="1" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand" />
                Challenge Generation
              </CardTitle>
              <CardDescription>
                Describe the challenge you want to create. Be specific about the topic, difficulty, and learning objectives.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="prompt">Challenge Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Create a network forensics challenge about analyzing PCAP files to identify malicious traffic. The challenge should focus on DNS tunneling detection and require participants to extract exfiltrated data. Include multiple artifacts and progressive hints. Target difficulty: Medium."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Include details about the challenge type, specific techniques to cover, artifacts needed, and target difficulty level.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quick Templates</Label>
                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrompt('Create a web application security challenge focusing on SQL injection vulnerabilities. Include a vulnerable login form and database with hidden flags. Difficulty: Easy to Medium.')}
                    >
                      Web Security
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrompt('Design a digital forensics challenge involving memory dump analysis. Participants should extract malware artifacts and identify persistence mechanisms. Include multiple forensic tools. Difficulty: Hard.')}
                    >
                      Digital Forensics
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrompt('Create a cryptography challenge about breaking a custom cipher. Include ciphertext samples and cryptanalysis hints. Focus on frequency analysis and pattern recognition. Difficulty: Medium.')}
                    >
                      Cryptography
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>AI Generation Tips</Label>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Be specific about the security domain and techniques</p>
                    <p>• Mention required artifacts (files, images, configs)</p>
                    <p>• Specify target difficulty and time estimate</p>
                    <p>• Include learning objectives and skills tested</p>
                    <p>• Describe the scenario or storyline</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Bot className="h-4 w-4 mr-2 animate-spin" />
                    Generating Challenge...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Challenge
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Materialize */}
        <TabsContent value="2" className="space-y-6">
          {generatedChallenge && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-brand" />
                    Generated Challenge Preview
                  </CardTitle>
                  <CardDescription>
                    Review the AI-generated challenge before materializing artifacts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Title</Label>
                        <p className="text-lg font-semibold">{generatedChallenge.title}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Track & Difficulty</Label>
                        <div className="flex gap-2">
                          <Badge variant="outline">{generatedChallenge.track.toUpperCase()}</Badge>
                          <Badge variant="outline">{generatedChallenge.difficulty.toUpperCase()}</Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Points & Time</Label>
                        <p>{generatedChallenge.points_base} points • {generatedChallenge.time_cap_minutes} minutes</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Artifacts ({generatedChallenge.artifacts.length})</Label>
                        <div className="space-y-1">
                          {generatedChallenge.artifacts.map((artifact, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4" />
                              <span>{artifact.filename}</span>
                              <Badge variant="outline" className="text-xs">{artifact.kind}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Hints ({generatedChallenge.hints.length})</Label>
                        <div className="space-y-1">
                          {generatedChallenge.hints.map((hint, i) => (
                            <div key={i} className="text-sm text-muted-foreground">
                              Hint {hint.order}: {hint.cost_percent}% penalty
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <div className="mt-2 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <p className="text-sm whitespace-pre-wrap">{generatedChallenge.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-brand" />
                    Materialize Artifacts
                  </CardTitle>
                  <CardDescription>
                    Generate the actual files and artifacts for this challenge
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleMaterialize}
                    disabled={isMaterializing}
                    className="w-full"
                    size="lg"
                  >
                    {isMaterializing ? (
                      <>
                        <Settings className="h-4 w-4 mr-2 animate-spin" />
                        Materializing Artifacts...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Materialize Challenge
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Step 3: Publish */}
        <TabsContent value="3" className="space-y-6">
          {materializedArtifacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Materialized Artifacts
                </CardTitle>
                <CardDescription>
                  Challenge artifacts have been generated and uploaded
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {materializedArtifacts.map((artifact: any, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-brand" />
                        <div>
                          <p className="font-medium">{artifact.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {artifact.size_bytes} bytes • {artifact.kind}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {artifact.sha256?.substring(0, 8)}...
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-brand" />
                Publish Challenge
              </CardTitle>
              <CardDescription>
                Deploy the challenge to a specific season and week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="season">Target Season</Label>
                  <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons?.map((season: any) => (
                        <SelectItem key={season.id} value={season.id}>
                          {season.name} {season.is_active && '(Current)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="week">Target Week (Optional)</Label>
                  <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select week or leave empty" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(8)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Week {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-400">Publishing Notice</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Once published, the challenge will be available to participants. 
                      Make sure to review all content and test the solution before publishing.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handlePublish}
                disabled={!selectedSeason || isPublishing}
                className="w-full"
                size="lg"
              >
                {isPublishing ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Publishing Challenge...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Publish to Season
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
