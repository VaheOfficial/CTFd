'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Server, RefreshCcw, Search, Play, Square, Trash2 } from 'lucide-react'

export default function AdminLabsPage() {
  const [containers, setContainers] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchLabs = async () => {
    setLoading(true)
    try {
      // This is a placeholder list sourced from the API later if exposed
      // For now, show an empty state with refresh
      setContainers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLabs()
  }, [])

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Server className="h-8 w-8 text-brand" />
            Lab Instances
          </h1>
          <p className="text-muted-foreground">Monitor and manage active lab containers</p>
        </div>
        <Button onClick={fetchLabs} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Filter by challenge, user, container ID..."
            className="pl-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Labs</CardTitle>
          <CardDescription>
            {containers.length} instance{containers.length === 1 ? '' : 's'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {containers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No active lab instances.
            </div>
          ) : (
            <div className="space-y-3">
              {containers.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{c.status}</Badge>
                    <div>
                      <div className="font-medium">{c.name || c.id}</div>
                      <div className="text-xs text-muted-foreground">{c.image}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Square className="h-4 w-4 mr-2" /> Stop
                    </Button>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


