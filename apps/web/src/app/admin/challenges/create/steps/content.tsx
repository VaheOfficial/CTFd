'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, FieldValues } from 'react-hook-form'
import * as z from 'zod'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

const formSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  solution_guide: z.string().min(1, 'Solution guide is required'),
  tags: z.array(z.string())
})

type FormData = z.infer<typeof formSchema>

interface ContentStepProps {
  data: Partial<FormData>
  onUpdate: (data: Partial<FormData>) => void
}

export function ContentStep({ data, onUpdate }: ContentStepProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: data.description || '',
      solution_guide: data.solution_guide || '',
      tags: data.tags || []
    }
  })

  useEffect(() => {
    const subscription = form.watch((value: Partial<FormData>) => {
      onUpdate(value)
    })
    return () => subscription.unsubscribe()
  }, [form, onUpdate])

  const addTag = (tag: string) => {
    const currentTags = form.getValues('tags')
    if (tag && !currentTags.includes(tag)) {
      form.setValue('tags', [...currentTags, tag])
    }
  }

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags')
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove))
  }

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }: { field: FieldValues }) => (
            <FormItem>
              <FormLabel>Challenge Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter a detailed description of the challenge..."
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Use Markdown for formatting. Include any necessary context and instructions.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="solution_guide"
          render={({ field }: { field: FieldValues }) => (
            <FormItem>
              <FormLabel>Solution Guide</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the solution guide..."
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide a detailed walkthrough of how to solve the challenge.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }: { field: FieldValues }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Input
                    placeholder="Add tags (press Enter)"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const input = e.currentTarget
                        addTag(input.value)
                        input.value = ''
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {field.value.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => removeTag(tag)}
                      >
                        {tag}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                Add relevant tags to help categorize the challenge
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}