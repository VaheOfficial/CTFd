'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, FieldValues, UseFormReturn, WatchObserver } from 'react-hook-form'
import * as z from 'zod'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, X } from 'lucide-react'

const validatorSchema = z.object({
  type: z.enum(['builtin', 'container']),
  image: z.string().optional(),
  command: z.array(z.string()).optional(),
  timeout_sec: z.number().min(1).max(300),
  network_policy: z.enum(['none', 'egress_only'])
})

const flagSchema = z.object({
  type: z.enum(['static', 'dynamic_hmac']),
  format: z.string().min(1),
  static_value: z.string().optional(),
  hmac_inputs: z.array(z.string()).optional()
})

const formSchema = z.object({
  validator: validatorSchema,
  flag: flagSchema
})

type FormData = z.infer<typeof formSchema>

interface ValidationStepProps {
  data: Partial<FormData>
  onUpdate: (data: Partial<FormData>) => void
}

interface FieldProps {
  field: {
    value: any
    onChange: (value: any) => void
  }
}

export function ValidationStep({ data, onUpdate }: ValidationStepProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      validator: {
        type: data.validator?.type || 'builtin',
        image: data.validator?.image || '',
        command: data.validator?.command || [],
        timeout_sec: data.validator?.timeout_sec || 30,
        network_policy: data.validator?.network_policy || 'none'
      },
      flag: {
        type: data.flag?.type || 'dynamic_hmac',
        format: data.flag?.format || 'flag{{{}}}',
        static_value: data.flag?.static_value || '',
        hmac_inputs: data.flag?.hmac_inputs || []
      }
    }
  })

  useEffect(() => {
    const subscription = form.watch((value) => {
      onUpdate(value as Partial<FormData>)
    }) as { unsubscribe: () => void }
    return () => subscription.unsubscribe()
  }, [form, onUpdate])

  const validatorType = form.watch('validator.type')

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="validator.type"
          render={({ field }: FieldProps) => (
            <FormItem>
              <FormLabel>Validator Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="builtin">Built-in Validator</SelectItem>
                  <SelectItem value="container">Container Validator</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose how to validate challenge submissions
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {validatorType === 'container' && (
          <>
            <FormField
              control={form.control}
              name="validator.image"
              render={({ field }: FieldProps) => (
                <FormItem>
                  <FormLabel>Container Image</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., python:3.9-slim" {...field} />
                  </FormControl>
                  <FormDescription>
                    Docker image to use for validation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="validator.command"
              render={({ field }: FieldProps) => (
                <FormItem>
                  <FormLabel>Command</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., python validate.py"
                      value={field.value?.join(' ') || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        form.setValue('validator.command', value ? value.split(' ') : [])
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Command to run in the container (space-separated)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="validator.network_policy"
              render={({ field }: FieldProps) => (
                <FormItem>
                  <FormLabel>Network Policy</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Network Access</SelectItem>
                      <SelectItem value="egress_only">Egress Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Network access policy for the validation container
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="validator.timeout_sec"
          render={({ field }: FieldProps) => (
            <FormItem>
              <FormLabel>Timeout (seconds)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={300}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Maximum time allowed for validation
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Flag Configuration */}
        <div className="space-y-6 border-t pt-6">
          <h3 className="text-lg font-medium">Flag Configuration</h3>
          
          <FormField
            control={form.control}
            name="flag.type"
            render={({ field }: FieldProps) => (
              <FormItem>
                <FormLabel>Flag Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="static">Static Flag</SelectItem>
                    <SelectItem value="dynamic_hmac">Dynamic HMAC Flag</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose between a static flag or a dynamically generated HMAC flag
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="flag.format"
            render={({ field }: FieldProps) => (
              <FormItem>
                <FormLabel>Flag Format</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., flag{{}}"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Format string for the flag. Use {"{{}}"} as a placeholder for the flag content.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch('flag.type') === 'static' && (
            <FormField
              control={form.control}
              name="flag.static_value"
              render={({ field }: FieldProps) => (
                <FormItem>
                  <FormLabel>Static Flag Value</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter the static flag value"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The exact flag value that will be used for validation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {form.watch('flag.type') === 'dynamic_hmac' && (
            <FormField
              control={form.control}
              name="flag.hmac_inputs"
              render={({ field }: FieldProps) => (
                <FormItem>
                  <FormLabel>HMAC Inputs</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Add HMAC inputs (press Enter)"
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const input = e.currentTarget
                          const currentInputs = form.getValues('flag.hmac_inputs') || []
                          if (input.value && !currentInputs.includes(input.value)) {
                            form.setValue('flag.hmac_inputs', [...currentInputs, input.value])
                          }
                          input.value = ''
                        }
                      }}
                    />
                  </FormControl>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value?.map((input: string, index: number) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => {
                          const currentInputs = [...(field.value || [])]
                          currentInputs.splice(index, 1)
                          form.setValue('flag.hmac_inputs', currentInputs)
                        }}
                      >
                        {input}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                  <FormDescription>
                    Additional inputs to use in HMAC flag generation (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {validatorType === 'container' && (
          <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-yellow-500">
                Container validators require proper configuration and testing. Make sure your container image and command are correct.
              </p>
            </div>
          </Card>
        )}
      </form>
    </Form>
  )
}