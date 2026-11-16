import {
  PROGRESS_SIZE_CLASS,
  PROGRESS_TONE_CLASS,
  PROGRESS_TRACK_CLASS,
} from "@/lib/constants/ui"
import type { ProgressProps } from "@/lib/interfaces/progress"
import { cn } from "@/lib/utils"

function Progress({
  value,
  max = 100,
  size = "default",
  tone = "primary",
  role = "progressbar",
  decorative = false,
  className,
  indicatorClassName,
  ...props
}: ProgressProps) {
  const clampedValue = Math.min(Math.max(value, 0), max)
  const percent = max > 0 ? (clampedValue / max) * 100 : 0
  const semantics = decorative
    ? { "aria-hidden": true }
    : {
        role,
        "aria-valuemin": 0,
        "aria-valuemax": max,
        "aria-valuenow": clampedValue,
      }

  return (
    <div
      data-slot="progress"
      {...semantics}
      className={cn(PROGRESS_TRACK_CLASS, PROGRESS_SIZE_CLASS[size], className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
          PROGRESS_TONE_CLASS[tone],
          indicatorClassName,
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export { Progress }
