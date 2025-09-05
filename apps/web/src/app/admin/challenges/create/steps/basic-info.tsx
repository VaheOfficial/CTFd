'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, and hyphens',
  }),
  track: z.enum(['INTEL_RECON', 'ACCESS_EXPLOIT', 'IDENTITY_CLOUD', 'C2_EGRESS', 'DETECT_FORENSICS']),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'INSANE']),
  points_base: z.number().min(1, 'Points must be greater than 0'),
  time_cap_minutes: z.number().min(1, 'Time cap must be greater than 0'),
  mode: z.enum(['solo', 'team'])
})

interface BasicInfoStepProps {
  data: any
  onUpdate: (data: any) => void
}

export function BasicInfoStep({ data, onUpdate }: BasicInfoStepProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: data.title || '',
      slug: data.slug || '',
      track: data.track || 'INTEL_RECON',
      difficulty: data.difficulty || 'MEDIUM',
      points_base: data.points_base || 100,
      time_cap_minutes: data.time_cap_minutes || 60,
      mode: data.mode || 'solo'
    }
  })

  useEffect(() => {
    const subscription = form.watch((value) => {
      onUpdate(value)
    })
    return () => subscription.unsubscribe()
  }, [form, onUpdate])

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Challenge Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter challenge title" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive title for your challenge
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Challenge Slug</FormLabel>
              <FormControl>
                <Input placeholder="enter-challenge-slug" {...field} />
              </FormControl>
              <FormDescription>
                A unique identifier for your challenge (lowercase letters, numbers, and hyphens only)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="track"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Track</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a track" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="INTEL_RECON">Intel & Recon</SelectItem>
                    <SelectItem value="ACCESS_EXPLOIT">Access & Exploit</SelectItem>
                    <SelectItem value="IDENTITY_CLOUD">Identity & Cloud</SelectItem>
                    <SelectItem value="C2_EGRESS">C2 & Egress</SelectItem>
                    <SelectItem value="DETECT_FORENSICS">Detect & Forensics</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  The category this challenge belongs to
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulty</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                    <SelectItem value="INSANE">Insane</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  How difficult is this challenge
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="points_base"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Points</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={e => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Initial points value for the challenge
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time_cap_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time Cap (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={e => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Maximum time allowed to solve
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Challenge Mode</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="solo">Solo</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Whether this is an individual or team challenge
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
