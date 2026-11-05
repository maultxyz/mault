import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SliderFieldProps } from "@/lib/interfaces/slider-field";
import { cn } from "@/lib/utils";
import { IconInfoCircle } from "@tabler/icons-react";
import { useId } from "react";

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
  const labelId = useId();
  const valueText =
    typeof valueLabel === "string" || typeof valueLabel === "number"
      ? String(valueLabel)
      : undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <span id={labelId}>{label}</span>
          {description && (
            <Tooltip>
              <TooltipTrigger className="text-foreground/70 transition-colors hover:text-foreground">
                <IconInfoCircle className="size-3.5" />
                <span className="sr-only">{description}</span>
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
        aria-labelledby={labelId}
        getAriaValueText={valueText ? () => valueText : undefined}
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
