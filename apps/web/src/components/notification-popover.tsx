'use client'

import * as React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'

type Notification = {
  id: number
  title: string
  message: string
  created_at: string
  read: boolean
}

type NotificationResponse = {
  data?: Notification[]
  error?: {
    message: string
    status: number
  }
}

export function NotificationPopover() {
  const [open, setOpen] = React.useState(false)
  const queryClient = useQueryClient()
  
  const { data: notifications = [] } = useQuery<Notification[], Error, Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await apiClient.getNotifications() as NotificationResponse
      if (response.error) throw new Error(response.error.message)
      return response.data || []
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => apiClient.markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiClient.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="fixed top-6 right-6 z-50 h-14 w-14 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-xl hover:shadow-2xl text-muted-foreground hover:text-foreground hover:bg-card transition-all duration-200 hover:scale-105"
        >
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-accent animate-ping" />
              <div className="absolute inset-0 rounded-full bg-accent" />
              <span className="relative text-[10px] font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={16}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs"
              onClick={() => markAllAsReadMutation.mutate()}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center p-4">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    !notification.read && "bg-muted/30"
                  )}
                  onClick={() => markAsReadMutation.mutate(notification.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-1">
                      <p className={cn(
                        "text-sm",
                        !notification.read && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
