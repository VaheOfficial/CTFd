import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-xl border-0 px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm min-h-[32px]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10 text-primary border border-primary/30 hover:from-primary/30 hover:via-primary/25 hover:to-primary/20 shadow-md",
        secondary:
          "bg-gradient-to-r from-secondary/20 via-secondary/15 to-secondary/10 text-secondary border border-secondary/30 hover:from-secondary/30 hover:via-secondary/25 hover:to-secondary/20 shadow-md",
        destructive:
          "bg-gradient-to-r from-destructive/20 via-destructive/15 to-destructive/10 text-destructive border border-destructive/30 hover:from-destructive/30 hover:via-destructive/25 hover:to-destructive/20 shadow-md",
        outline: "bg-card/50 text-foreground border border-border hover:bg-card/80 shadow-md",
        // Enhanced difficulty variants with modern gradients
        easy: "bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:from-emerald-500/30 hover:via-emerald-500/25 hover:to-emerald-500/20 shadow-md shadow-emerald-500/10",
        medium: "bg-gradient-to-r from-yellow-500/20 via-yellow-500/15 to-yellow-500/10 text-yellow-300 border border-yellow-500/30 hover:from-yellow-500/30 hover:via-yellow-500/25 hover:to-yellow-500/20 shadow-md shadow-yellow-500/10",
        hard: "bg-gradient-to-r from-orange-500/20 via-orange-500/15 to-orange-500/10 text-orange-300 border border-orange-500/30 hover:from-orange-500/30 hover:via-orange-500/25 hover:to-orange-500/20 shadow-md shadow-orange-500/10",
        insane: "bg-gradient-to-r from-red-500/20 via-red-500/15 to-red-500/10 text-red-300 border border-red-500/30 hover:from-red-500/30 hover:via-red-500/25 hover:to-red-500/20 shadow-md shadow-red-500/10",
        // Modern cybersecurity variants
        cyber: "bg-gradient-to-r from-accent/20 via-accent/15 to-accent/10 text-accent border border-accent/30 hover:from-accent/30 hover:via-accent/25 hover:to-accent/20 shadow-md shadow-accent/10",
        success: "bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:from-emerald-500/30 hover:via-emerald-500/25 hover:to-emerald-500/20 shadow-md shadow-emerald-500/10",
        warning: "bg-gradient-to-r from-yellow-500/20 via-yellow-500/15 to-yellow-500/10 text-yellow-300 border border-yellow-500/30 hover:from-yellow-500/30 hover:via-yellow-500/25 hover:to-yellow-500/20 shadow-md shadow-yellow-500/10",
        info: "bg-gradient-to-r from-blue-500/20 via-blue-500/15 to-blue-500/10 text-blue-300 border border-blue-500/30 hover:from-blue-500/30 hover:via-blue-500/25 hover:to-blue-500/20 shadow-md shadow-blue-500/10",
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