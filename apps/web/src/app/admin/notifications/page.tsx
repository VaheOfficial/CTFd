'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function NotificationsPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isGlobal, setIsGlobal] = useState(true)
  const [userId, setUserId] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const sendNotification = useMutation({
    mutationFn: async (data: { title: string; message: string; is_global: boolean; user_id?: number }) => {
      const response = await apiClient.createNotification(data)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Notification sent successfully',
      })
      setTitle('')
      setMessage('')
      setUserId('')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !message) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    sendNotification.mutate({
      title,
      message,
      is_global: isGlobal,
      user_id: isGlobal ? undefined : parseInt(userId),
    })
  }

  return (
    <div className="space-y-10 py-8 px-24">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-accent/20 via-accent/15 to-accent/10 border border-accent/20 shadow-lg">
            <Bell className="h-10 w-10 text-accent" />
          </div>
          Send Notification
        </h1>
        <p className="text-lg text-muted-foreground ml-16">
          Send notifications to users of your platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Notification</CardTitle>
          <CardDescription>
            Create a new notification to send to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification title"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your notification message"
                  className="mt-1.5 min-h-[100px]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Global Notification</Label>
                  <p className="text-sm text-muted-foreground">
                    Send to all users
                  </p>
                </div>
                <Switch
                  checked={isGlobal}
                  onCheckedChange={setIsGlobal}
                />
              </div>

              {!isGlobal && (
                <div>
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter user ID"
                    type="number"
                    className="mt-1.5"
                  />
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              size="lg"
              disabled={sendNotification.isPending}
              className="w-full"
            >
              {sendNotification.isPending ? 'Sending...' : 'Send Notification'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
