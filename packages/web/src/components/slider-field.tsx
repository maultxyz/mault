import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SliderFieldProps } from "@/lib/interfaces/slider-field";
import { cn } from "@/lib/utils";
import { IconInfoCircle } from "@tabler/icons-react";

export function SliderField({
  label,
  valueLabel,
  description,
  min,
  max,
  step = 1,
  value,
  disabled,
  onValueChange,
  onValueCommitted,
  className,
  children,
}: SliderFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          {label}
          {description && (
            <Tooltip>
              <TooltipTrigger className="text-foreground/70 transition-colors hover:text-foreground">
                <IconInfoCircle className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {description}
              </TooltipContent>
            </Tooltip>
          )}
        </span>
        <span className="text-sm font-semibold tabular-nums">{valueLabel}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={value}
        onValueChange={onValueChange}
        onValueCommitted={onValueCommitted}
      />
      {children}
    </div>
  );
}
