'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api/client'
import { BarChart3, Activity, Users, Target } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    let aborted = false
    ;(async () => {
      const [ovr, useg, hlth] = await Promise.all([
        apiClient.getAdminAnalyticsOverview(),
        apiClient.getAdminAnalyticsUsage(),
        apiClient.getAdminAnalyticsHealth(),
      ]) as any
      if (!aborted) {
        setOverview(ovr.data)
        setUsage(useg.data)
        setHealth(hlth.data)
      }
    })()
    return () => { aborted = true }
  }, [])

  return (
    <div className="space-y-8 py-8 px-24">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-brand" />
        <h1 className="text-3xl font-bold">Analytics</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4"/> Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview?.totals?.users ?? '-'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-4 w-4"/> Challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview?.totals?.challenges ?? '-'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4"/> Active Labs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview?.totals?.active_labs ?? '-'}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engagement (24h)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Submissions</div>
              <div className="text-2xl font-bold">{overview?.engagement?.submissions_last_24h ?? '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">AI Generations</div>
              <div className="text-2xl font-bold">{overview?.engagement?.ai_generations_last_24h ?? '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">DAU</div>
              <div className="text-2xl font-bold">{overview?.engagement?.daily_active_users ?? '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">WAU</div>
              <div className="text-2xl font-bold">{overview?.engagement?.weekly_active_users ?? '-'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Challenges (24h)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(usage?.top_challenges_last_24h || []).map((c: any) => (
              <div key={c.challenge_id} className="flex items-center justify-between">
                <div className="truncate mr-4">{c.title}</div>
                <div className="text-muted-foreground">{c.submissions} submissions</div>
              </div>
            ))}
            {(!usage?.top_challenges_last_24h || usage?.top_challenges_last_24h.length === 0) && (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {health && Object.entries(health.lab_instances || {}).map(([status, count]) => (
            <div key={status}>
              <div className="text-sm text-muted-foreground">{status}</div>
              <div className="text-2xl font-bold">{count as any}</div>
            </div>
          ))}
          <div>
            <div className="text-sm text-muted-foreground">Errors (24h)</div>
            <div className="text-2xl font-bold">{health?.errors_last_24h ?? '-'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


