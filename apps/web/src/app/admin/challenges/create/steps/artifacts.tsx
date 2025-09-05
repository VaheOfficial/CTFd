'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, FieldValues } from 'react-hook-form'
import * as z from 'zod'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  artifacts: z.array(z.object({
    file: z.any(),
    kind: z.enum(['pcap', 'csv', 'jsonl', 'bin', 'zip', 'eml', 'log', 'image', 'other']),
    original_filename: z.string(),
    size_bytes: z.number()
  }))
})

type FormData = z.infer<typeof formSchema>

interface ArtifactsStepProps {
  data: Partial<FormData>
  onUpdate: (data: Partial<FormData>) => void
}

export function ArtifactsStep({ data, onUpdate }: ArtifactsStepProps) {
  const [dragActive, setDragActive] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      artifacts: data.artifacts || []
    }
  })

  useEffect(() => {
    const subscription = form.watch((value: Partial<FormData>) => {
      onUpdate(value)
    })
    return () => subscription.unsubscribe()
  }, [form, onUpdate])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (files: FileList) => {
    const currentArtifacts = form.getValues('artifacts') || []
    const newArtifacts = Array.from(files).map(file => ({
      file,
      kind: 'other',
      original_filename: file.name,
      size_bytes: file.size
    }))
    form.setValue('artifacts', [...currentArtifacts, ...newArtifacts])
  }

  const removeArtifact = (index: number) => {
    const artifacts = form.getValues('artifacts')
    artifacts.splice(index, 1)
    form.setValue('artifacts', artifacts)
  }

  const updateArtifactKind = (index: number, kind: string) => {
    const artifacts = form.getValues('artifacts')
    artifacts[index].kind = kind
    form.setValue('artifacts', artifacts)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="artifacts"
          render={({ field }: { field: FieldValues }) => (
            <FormItem>
              <FormLabel>Challenge Artifacts</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center',
                      dragActive ? 'border-brand bg-brand/5' : 'border-muted'
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Drag and drop files here, or{' '}
                      <label className="cursor-pointer text-brand hover:underline">
                        browse
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleChange}
                        />
                      </label>
                    </p>
                  </div>

                  {field.value?.length > 0 && (
                    <div className="space-y-2">
                      {field.value.map((artifact: any, index: number) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{artifact.original_filename}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatFileSize(artifact.size_bytes)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Select
                                value={artifact.kind}
                                onValueChange={(value) => updateArtifactKind(index, value)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pcap">PCAP</SelectItem>
                                  <SelectItem value="csv">CSV</SelectItem>
                                  <SelectItem value="jsonl">JSONL</SelectItem>
                                  <SelectItem value="bin">Binary</SelectItem>
                                  <SelectItem value="zip">ZIP</SelectItem>
                                  <SelectItem value="eml">Email</SelectItem>
                                  <SelectItem value="log">Log</SelectItem>
                                  <SelectItem value="image">Image</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeArtifact(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload any files needed for the challenge. Each file requires a type selection.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.getValues('artifacts')?.length > 0 && (
          <div className="flex items-center space-x-2 rounded-md bg-yellow-500/10 p-4">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <p className="text-sm text-yellow-500">
              Files will be uploaded when you create the challenge. Make sure to select appropriate types for all files.
            </p>
          </div>
        )}
      </form>
    </Form>
  )
}