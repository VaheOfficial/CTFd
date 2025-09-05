'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSeasons, useCreateSeason } from '@/lib/api/hooks'
import { formatPoints } from '@/lib/utils'
import { 
  Trophy, 
  Plus, 
  Calendar, 
  Settings, 
  Eye,
  BadgeCheckIcon,
  Clock,
  CheckCircle
} from 'lucide-react'

export default function AdminSeasonsPage() {
  const { data: seasons, isLoading } = useSeasons()
  const createSeasonMutation = useCreateSeason()
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newSeason, setNewSeason] = useState({
    name: '',
    description: '',
    start_date: '',
    total_weeks: 8
  })

  // Calculate end date based on start date and total weeks
  const calculateEndDate = (startDate: string, totalWeeks: number) => {
    if (!startDate) return null
    const start = new Date(startDate)
    const end = new Date(start.getTime() + (totalWeeks * 7 * 24 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000))
    return end.toISOString().split('T')[0] // Format as YYYY-MM-DD
  }

  const handleCreateSeason = async () => {
    try {
      await createSeasonMutation.mutateAsync(newSeason)
      setShowCreateForm(false)
      setNewSeason({
        name: '',
        description: '',
        start_date: '',
        total_weeks: 8
      })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const getSeasonStatus = (season: any) => {
    const now = new Date()
    const start = new Date(season.start_at)
    const end = new Date(season.end_at)
    
    if (season.is_active) return 'active'
    if (now < start) return 'upcoming'
    if (now > end) return 'completed'
    return 'draft'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <BadgeCheckIcon className="h-4 w-4 text-yellow-400" />
      case 'upcoming':
        return <Clock className="h-4 w-4 text-blue-400" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      default:
        return <Settings className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">ACTIVE</Badge>
      case 'upcoming':
        return <Badge variant="outline">UPCOMING</Badge>
      case 'completed':
        return <Badge variant="outline">COMPLETED</Badge>
      default:
        return <Badge variant="outline">DRAFT</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 py-8 px-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-8 w-8 text-brand" />
            Season Management
          </h1>
          <p className="text-muted-foreground">
            Create and manage competition seasons
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Season
        </Button>
      </div>

      {/* Create Season Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Season</CardTitle>
            <CardDescription>
              Set up a new competition season with challenges and timeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Season Name</Label>
                <Input
                  id="name"
                  placeholder="Winter DCO Challenge 2024"
                  value={newSeason.name}
                  onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weeks">Total Weeks</Label>
                <Select 
                  value={newSeason.total_weeks.toString()} 
                  onValueChange={(value) => setNewSeason({ ...newSeason, total_weeks: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12].map(weeks => (
                      <SelectItem key={weeks} value={weeks.toString()}>
                        {weeks} weeks
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A comprehensive cybersecurity challenge focusing on defensive techniques and incident response..."
                value={newSeason.description}
                onChange={(e) => setNewSeason({ ...newSeason, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={newSeason.start_date}
                  onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (Auto-calculated)</Label>
                <div className="flex items-center h-10 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-slate-300">
                  {newSeason.start_date && newSeason.total_weeks ? (
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-400" />
                      {calculateEndDate(newSeason.start_date, newSeason.total_weeks)}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">Select start date and weeks</span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Calculated as: Start Date + {newSeason.total_weeks} weeks - 1 day
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateSeason}
                disabled={!newSeason.name || !newSeason.start_date || createSeasonMutation.isPending}
              >
                {createSeasonMutation.isPending ? 'Creating...' : 'Create Season'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seasons List */}
      <div className="space-y-6">
        {seasons && seasons.length > 0 ? (
          <div className="grid gap-6">
            {seasons.map((season: any) => {
              const status = getSeasonStatus(season)
              return (
                <Card key={season.id} className="hover:border-brand/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(status)}
                        <div>
                          <CardTitle className="text-xl">{season.name}</CardTitle>
                          <CardDescription>
                            {season.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-3 rounded-lg bg-slate-800/30">
                        <div className="text-lg font-bold text-brand">
                          Week {season.current_week || 1}
                        </div>
                        <div className="text-sm text-muted-foreground">Current Week</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-slate-800/30">
                        <div className="text-lg font-bold">
                          {season.total_weeks || 8}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Weeks</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-slate-800/30">
                        <div className="text-lg font-bold">
                          {season.total_challenges || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Challenges</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-slate-800/30">
                        <div className="text-lg font-bold">
                          {season.total_participants || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Participants</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(season.start_at).toLocaleDateString()} - {new Date(season.end_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/seasons/${season.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-16">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">No Seasons Created</CardTitle>
              <CardDescription className="mb-6">
                Create your first competition season to get started
              </CardDescription>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Season
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
