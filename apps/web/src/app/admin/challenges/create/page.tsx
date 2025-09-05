'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { Steps } from '@/components/ui/steps'
import { useToast } from '@/components/ui/use-toast'
import { BasicInfoStep } from './steps/basic-info'
import { ContentStep } from './steps/content'
import { ArtifactsStep } from './steps/artifacts'
import { HintsStep } from './steps/hints'
import { ValidationStep } from './steps/validation'
import { PreviewStep } from './steps/preview'
import { useCreateChallenge } from '@/lib/api/hooks'
import { ChallengeFormData, ChallengeTrack, ChallengeDifficulty, ChallengeMode, ValidatorType, NetworkPolicy } from '@/types/challenge'

const steps = [
  { title: 'Basic Info', description: 'Challenge details and configuration' },
  { title: 'Content', description: 'Description and solution guide' },
  { title: 'Artifacts', description: 'Upload challenge files' },
  { title: 'Hints', description: 'Configure help hints' },
  { title: 'Validation', description: 'Setup answer validation' },
  { title: 'Preview', description: 'Review and publish' }
]

export default function CreateChallengePage() {
  const router = useRouter()
  const { toast } = useToast()
  const createChallenge = useCreateChallenge()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<ChallengeFormData>({
    // Basic Info
    title: '',
    slug: '',
    track: 'INTEL_RECON' as ChallengeTrack,
    difficulty: 'MEDIUM' as ChallengeDifficulty,
    points_base: 0,
    time_cap_minutes: 60,
    mode: 'solo' as ChallengeMode,
    
    // Content
    description: '',
    solution_guide: '',
    tags: [],
    
    // Artifacts
    artifacts: [],
    
    // Hints
    hints: [],
    
    // Validation
    validator: {
      type: 'builtin' as ValidatorType,
      image: '',
      command: [],
      timeout_sec: 30,
      network_policy: 'none' as NetworkPolicy
    }
  })

  const updateFormData = (stepData: Partial<ChallengeFormData>) => {
    setFormData(prev => ({ ...prev, ...stepData }))
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      const request = {
        challengeYaml: {
          id: formData.slug,
          title: formData.title,
          track: formData.track,
          difficulty: formData.difficulty,
          points: formData.points_base,
          time_cap_minutes: formData.time_cap_minutes,
          mode: formData.mode,
          description: formData.description,
          artifacts: formData.artifacts.map(artifact => ({
            s3_key: '', // Will be filled by the backend
            sha256: '', // Will be filled by the backend
            size_bytes: artifact.size_bytes,
            kind: artifact.kind,
            path: artifact.original_filename
          })),
          hints: formData.hints.map(hint => ({
            order: hint.order,
            text: hint.text,
            cost_percent: hint.cost_percent
          })),
          validator: {
            type: formData.validator.type,
            image: formData.validator.image,
            cmd: formData.validator.command,
            timeout_sec: formData.validator.timeout_sec,
            network_policy: formData.validator.network_policy
          }
        }
      }

      await createChallenge.mutateAsync(request)

      toast({
        title: 'Success',
        description: 'Challenge created successfully',
      })
      router.push('/admin/challenges')
    } catch (error) {
      console.error('Failed to create challenge:', error)
      toast({
        title: 'Error',
        description: 'Failed to create challenge. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep data={formData} onUpdate={updateFormData} />
      case 1:
        return <ContentStep data={formData} onUpdate={updateFormData} />
      case 2:
        return <ArtifactsStep data={formData} onUpdate={updateFormData} />
      case 3:
        return <HintsStep data={formData} onUpdate={updateFormData} />
      case 4:
        return <ValidationStep data={formData} onUpdate={updateFormData} />
      case 5:
        return <PreviewStep data={formData} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-8 py-8 px-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Challenge</h1>
          <p className="text-muted-foreground">
            Create a new challenge using the step-by-step wizard
          </p>
        </div>
      </div>

      <Steps
        steps={steps}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

      <Card className="p-6">
        {renderStep()}
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/challenges')}
          >
            Cancel
          </Button>
          
          {currentStep === steps.length - 1 ? (
            <Button 
              onClick={handleSubmit}
              disabled={createChallenge.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createChallenge.isPending ? 'Creating...' : 'Create Challenge'}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}