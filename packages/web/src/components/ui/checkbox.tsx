import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { useLabelledByHiddenInput } from "@/hooks/use-labelled-by-hidden-input"
import { cn } from "@/lib/utils"
import { IconCheck, IconMinus } from "@tabler/icons-react"

function Checkbox({ className, ref, ...props }: CheckboxPrimitive.Root.Props) {
  const controlRef = useLabelledByHiddenInput<HTMLElement>(
    ref,
    Boolean(props["aria-label"] || props["aria-labelledby"])
  )
  return (
    <CheckboxPrimitive.Root
      ref={controlRef}
      data-slot="checkbox"
      className={cn(
        "peer group/checkbox relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-card shadow-input transition-shadow outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-border/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-[color-mix(in_oklch,var(--primary),black_8%)] data-checked:bg-primary data-checked:bg-linear-to-b data-checked:from-white/8 data-checked:to-white/0 data-checked:text-primary-foreground data-checked:shadow-button-raised group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <IconCheck className="group-data-indeterminate/checkbox:hidden" />
        <IconMinus className="hidden group-data-indeterminate/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
