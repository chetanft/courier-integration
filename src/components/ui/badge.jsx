import * as React from "react"
import { cn } from "../../lib/utils"
import { badgeVariants } from "./badge-variants"

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(badgeVariants({ variant }), className)}
    {...props}
  />
))
Badge.displayName = "Badge"

export { Badge }
