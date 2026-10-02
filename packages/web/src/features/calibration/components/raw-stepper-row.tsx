import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import type { RawStepperRowProps } from "@/lib/interfaces/slider-field";

export function RawStepperRow({
  value,
  min,
  max,
  bigStep,
  smallStep,
  disabled,
  onChange,
  valueLabel,
}: RawStepperRowProps) {
  const clamp = (v: number) =>
    Math.max(min, max != null ? Math.min(max, v) : v);
  return (
    <ButtonGroup className="w-full">
      <Button
        variant="outline"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - bigStep))}
        className="px-2 text-xs"
      >
        -{bigStep}
      </Button>
      <Button
        variant="outline"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - smallStep))}
        className="px-2 text-xs"
      >
        -{smallStep}
      </Button>
      <div className="flex flex-1 items-center justify-center border-y bg-background px-2 text-sm font-semibold tabular-nums">
        {valueLabel}
      </div>
      <Button
        variant="outline"
        disabled={disabled || (max != null && value >= max)}
        onClick={() => onChange(clamp(value + smallStep))}
        className="px-2 text-xs"
      >
        +{smallStep}
      </Button>
      <Button
        variant="outline"
        disabled={disabled || (max != null && value >= max)}
        onClick={() => onChange(clamp(value + bigStep))}
        className="px-2 text-xs"
      >
        +{bigStep}
      </Button>
    </ButtonGroup>
  );
}
