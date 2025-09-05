'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, FieldValues } from 'react-hook-form'
import * as z from 'zod'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X, GripVertical } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

const formSchema = z.object({
  hints: z.array(z.object({
    text: z.string().min(1, 'Hint text is required'),
    cost_percent: z.number().min(0).max(100),
    order: z.number()
  }))
})

type FormData = z.infer<typeof formSchema>

interface Hint {
  text: string
  cost_percent: number
  order: number
}

interface HintsStepProps {
  data: Partial<FormData>
  onUpdate: (data: Partial<FormData>) => void
}

export function HintsStep({ data, onUpdate }: HintsStepProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hints: data.hints || []
    }
  })

  useEffect(() => {
    const subscription = form.watch((value: Partial<FormData>) => {
      onUpdate(value)
    })
    return () => subscription.unsubscribe()
  }, [form, onUpdate])

  const addHint = () => {
    const hints = form.getValues('hints') || []
    form.setValue('hints', [
      ...hints,
      {
        text: '',
        cost_percent: 10,
        order: hints.length
      }
    ])
  }

  const removeHint = (index: number) => {
    const hints = form.getValues('hints')
    hints.splice(index, 1)
    // Update order for remaining hints
    hints.forEach((hint: Hint, i: number) => {
      hint.order = i
    })
    form.setValue('hints', hints)
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const hints = form.getValues('hints')
    const [reorderedItem] = hints.splice(result.source.index, 1)
    hints.splice(result.destination.index, 0, reorderedItem)

    // Update order for all hints
    hints.forEach((hint: Hint, index: number) => {
      hint.order = index
    })

    form.setValue('hints', hints)
  }

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="hints"
          render={({ field }: { field: FieldValues }) => (
            <FormItem>
              <FormLabel>Challenge Hints</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="hints">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2"
                        >
                          {field.value?.map((hint: Hint, index: number) => (
                            <Draggable
                              key={index}
                              draggableId={`hint-${index}`}
                              index={index}
                            >
                              {(provided) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="p-4"
                                >
                                  <div className="flex items-start space-x-4">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="mt-2 cursor-move"
                                    >
                                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium">
                                          Hint {index + 1}
                                        </p>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeHint(index)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      <Textarea
                                        placeholder="Enter hint text..."
                                        value={hint.text}
                                        onChange={(e) => {
                                          const hints = [...field.value]
                                          hints[index].text = e.target.value
                                          form.setValue('hints', hints)
                                        }}
                                      />
                                      <div className="flex items-center space-x-2">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={hint.cost_percent}
                                          onChange={(e) => {
                                            const hints = [...field.value]
                                            hints[index].cost_percent = parseInt(e.target.value)
                                            form.setValue('hints', hints)
                                          }}
                                          className="w-24"
                                        />
                                        <span className="text-sm text-muted-foreground">
                                          % point reduction
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={addHint}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Hint
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Add optional hints that users can unlock. Each hint reduces the points awarded.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}