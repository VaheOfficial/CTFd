import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-base font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground hover:from-primary/90 hover:via-primary/85 hover:to-primary/80 shadow-lg hover:shadow-xl",
        destructive:
          "bg-gradient-to-r from-destructive via-destructive/95 to-destructive/90 text-destructive-foreground hover:from-destructive/90 hover:via-destructive/85 hover:to-destructive/80 shadow-lg hover:shadow-xl",
        outline:
          "border-2 border-border bg-background/50 backdrop-blur-sm hover:bg-card/80 hover:border-primary/50 text-foreground shadow-md hover:shadow-lg",
        secondary:
          "bg-gradient-to-r from-secondary via-secondary/95 to-secondary/90 text-secondary-foreground hover:from-secondary/90 hover:via-secondary/85 hover:to-secondary/80 shadow-lg hover:shadow-xl",
        ghost: "hover:bg-card/50 hover:text-foreground backdrop-blur-sm",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        // Modern cybersecurity variants
        cyber: "bg-gradient-to-r from-accent via-accent/95 to-accent/90 text-accent-foreground hover:from-accent/90 hover:via-accent/85 hover:to-accent/80 shadow-lg hover:shadow-xl",
        success: "bg-gradient-to-r from-emerald-600 via-emerald-600/95 to-emerald-600/90 text-white hover:from-emerald-500 hover:via-emerald-500/95 hover:to-emerald-500/90 shadow-lg hover:shadow-xl",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-lg px-4 py-2 text-sm min-h-[40px]",
        lg: "h-14 rounded-xl px-8 py-4 text-lg min-h-[48px]",
        icon: "h-12 w-12 min-h-[44px]",
        "icon-sm": "h-10 w-10 min-h-[40px]",
        "icon-lg": "h-14 w-14 min-h-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }