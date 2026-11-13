import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { useFieldControlAttributes } from "@/lib/field-control-context"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const fieldControlAttributes = useFieldControlAttributes()
  return (
    <InputPrimitive
      type={type}
      {...fieldControlAttributes}
      data-slot="input"
      className={cn(
        "h-7 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 py-0.5 text-base transition-colors outline-none file:inline-flex file:h-5 file:border-0 file:bg-transparent file:text-xs/relaxed file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 max-md:h-11 max-md:px-3 md:text-control dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
