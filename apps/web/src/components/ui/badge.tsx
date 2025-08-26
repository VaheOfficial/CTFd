import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-slate-700",
        // Difficulty variants
        easy: "bg-emerald-500/15 text-emerald-300 border-emerald-700/40",
        medium: "bg-lime-500/15 text-lime-300 border-lime-700/40",
        hard: "bg-yellow-500/15 text-yellow-300 border-yellow-700/40",
        insane: "bg-rose-500/15 text-rose-300 border-rose-700/40",
        // Additional variants used in pages
        terminal: "bg-brand/20 text-brand border-brand/40",
        warning: "bg-yellow-500/20 text-yellow-400 border-yellow-700/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }