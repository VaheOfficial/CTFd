'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiClient } from '@/lib/api/client'
import { ArrowLeft, Save, Calendar, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const WEEK_OPTIONS = [1, 2, 3, 4, 6, 8, 10, 12]

export default function EditSeasonPage() {
  const params = useParams()
  const router = useRouter()
  const seasonId = params.seasonId as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [season, setSeason] = useState({
    name: '',
    description: '',
    start_date: '',
    total_weeks: 8,
    theme: ''
  })

  useEffect(() => {
    loadSeason()
  }, [seasonId])

  const loadSeason = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getSeason(seasonId)
      console.log('Season response:', response)
      
      if (response.error) {
        toast.error('Failed to load season: ' + response.error.message)
        return
      }
      
      if (response.data) {
        // Convert datetime to YYYY-MM-DD format for the input
        const startDate = new Date(response.data.start_at).toISOString().split('T')[0]
        setSeason({
          name: response.data.name || '',
          description: response.data.description || '',
          start_date: startDate,
          total_weeks: response.data.total_weeks || 8,
          theme: response.data.theme || ''
        })
      }
    } catch (error: any) {
      console.error('Error loading season:', error)
      toast.error('Failed to load season: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!season.name || !season.start_date) {
      toast.error('Name and start date are required')
      return
    }

    try {
      setSaving(true)
      const response = await apiClient.updateSeason(seasonId, season)
      
      if (response.error) {
        toast.error('Failed to update season: ' + response.error.message)
      } else {
        toast.success('Season updated successfully')
        router.push('/admin/seasons')
      }
    } catch (error: any) {
      toast.error('Failed to update season: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const calculateEndDate = (startDate: string, totalWeeks: number) => {
    if (!startDate) return null
    const start = new Date(startDate)
    const end = new Date(start.getTime() + (totalWeeks * 7 * 24 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000))
    return end.toISOString().split('T')[0]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  const endDate = calculateEndDate(season.start_date, season.total_weeks)

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/seasons">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Season</h1>
            <p className="text-muted-foreground">Update season details and configuration</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Configure the season's core details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Season Name *</Label>
              <Input
                id="name"
                value={season.name}
                onChange={(e) => setSeason({ ...season, name: e.target.value })}
                placeholder="e.g., Winter DCO Challenge 2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Input
                id="theme"
                value={season.theme}
                onChange={(e) => setSeason({ ...season, theme: e.target.value })}
                placeholder="e.g., Cloud Security"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={season.description}
              onChange={(e) => setSeason({ ...season, description: e.target.value })}
              placeholder="Describe this season..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule
          </CardTitle>
          <CardDescription>Set the season duration and timing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={season.start_date}
                onChange={(e) => setSeason({ ...season, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_weeks">Duration (Weeks) *</Label>
              <Select 
                value={season.total_weeks.toString()} 
                onValueChange={(v) => setSeason({ ...season, total_weeks: parseInt(v) })}
              >
                <SelectTrigger id="total_weeks">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_OPTIONS.map((weeks) => (
                    <SelectItem key={weeks} value={weeks.toString()}>
                      {weeks} week{weeks !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {endDate && (
            <div className="rounded-lg border border-border bg-secondary/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Calculated End Date:</span>
                <span className="text-sm text-muted-foreground">{endDate}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

