import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface Step {
  title: string
  description: string
}

interface StepsProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (step: number) => void
}

export function Steps({ steps, currentStep, onStepClick }: StepsProps) {
  return (
    <div className="relative">
      <div className="absolute left-0 top-2 h-0.5 w-full bg-muted">
        <div
          className="absolute h-full bg-brand transition-all duration-500"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
      </div>

      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isClickable = onStepClick && index <= currentStep

          return (
            <div
              key={step.title}
              className={cn(
                'flex flex-col items-center',
                isClickable && 'cursor-pointer'
              )}
              onClick={() => isClickable && onStepClick(index)}
            >
              <div
                className={cn(
                  'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-200',
                  isCompleted
                    ? 'border-brand bg-brand text-white'
                    : isCurrent
                    ? 'border-brand bg-background text-brand'
                    : 'border-muted bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <div
                  className={cn(
                    'text-sm font-medium',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {step.description}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
