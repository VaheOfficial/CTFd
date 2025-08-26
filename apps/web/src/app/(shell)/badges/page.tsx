'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useBadges } from '@/lib/api/hooks'
import { Medal, Trophy, Zap, Shield, Target } from 'lucide-react'

export default function BadgesPage() {
  const { data: badges } = useBadges()

  const getBadgeIcon = (iconKey: string) => {
    switch (iconKey) {
      case 'first-blood':
        return Trophy
      case 'streak':
        return Zap
      case 'defender':
        return Shield
      case 'solver':
        return Target
      default:
        return Medal
    }
  }

  const getBadgeColor = (code: string) => {
    if (code.includes('first-blood')) return 'text-rose-400'
    if (code.includes('streak')) return 'text-yellow-400'
    if (code.includes('defender')) return 'text-emerald-400'
    return 'text-slate-400'
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Medal className="h-8 w-8 text-brand" />
          Your Badges
        </h1>
        <p className="text-muted-foreground">
          Achievements earned through your cybersecurity journey
        </p>
      </div>

      {badges && badges.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge: any) => {
            const IconComponent = getBadgeIcon(badge.icon_key)
            return (
              <Card key={badge.id} className="hover:border-brand/50 transition-colors">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/20">
                    <IconComponent className={`h-8 w-8 ${getBadgeColor(badge.code)}`} />
                  </div>
                  <CardTitle className="text-xl">{badge.name}</CardTitle>
                  <Badge variant="outline" className="w-fit mx-auto">
                    {badge.code.replace('-', ' ').toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <CardDescription>
                    {badge.description}
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Awarded on
                    </div>
                    <div className="font-mono text-sm">
                      {new Date(badge.awarded_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  {badge.reason && (
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="text-xs text-muted-foreground mb-1">Reason</div>
                      <div className="text-sm">{badge.reason}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-16">
            <Medal className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">No Badges Yet</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              Complete challenges and achievements to earn your first badge! 
              Badges recognize your progress in defensive cybersecurity skills.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Badge Categories Info */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Categories</CardTitle>
          <CardDescription>
            Different types of achievements you can earn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20">
                <Trophy className="h-4 w-4 text-rose-400" />
              </div>
              <div>
                <h4 className="font-medium">First Blood</h4>
                <p className="text-sm text-muted-foreground">
                  Be the first to solve a challenge
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/20">
                <Zap className="h-4 w-4 text-yellow-400" />
              </div>
              <div>
                <h4 className="font-medium">Streaks</h4>
                <p className="text-sm text-muted-foreground">
                  Solve challenges consecutively
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-medium">Defensive Skills</h4>
                <p className="text-sm text-muted-foreground">
                  Master defensive cybersecurity techniques
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/20">
                <Target className="h-4 w-4 text-slate-400" />
              </div>
              <div>
                <h4 className="font-medium">Challenge Solver</h4>
                <p className="text-sm text-muted-foreground">
                  Complete challenges across different categories
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
