import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-card/50 via-card/30 to-card/50 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

export function ChallengeCardSkeleton() {
  return (
    <div className="rounded-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/80 shadow-lg p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-7 w-3/4 rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-2/3 rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-16 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-28 rounded-xl" />
      </div>
    </div>
  )
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="flex items-center space-x-6 p-5 rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/80 shadow-lg">
          <Skeleton className="w-10 h-6 rounded-lg" />
          <Skeleton className="h-6 flex-1 rounded-lg" />
          <Skeleton className="w-20 h-6 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/80 shadow-lg p-8 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="h-4 w-28 rounded-lg" />
        </div>
      ))}
    </div>
  )
}
