import { Button } from "@/components/ui/button";
import type { TooltipRenderProps } from "react-joyride";

function withProgress(template: string, current: number, total: number): string {
  return template.replace("{current}", String(current)).replace("{total}", String(total));
}

export function TourTooltip({
  index,
  size,
  isLastStep,
  continuous,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
}: TooltipRenderProps) {
  const locale = step.locale;
  const primaryLabel = isLastStep
    ? locale.last
    : continuous && step.showProgress
      ? withProgress(String(locale.nextWithProgress), index + 1, size)
      : locale.next;

  return (
    <div
      {...tooltipProps}
      className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      {step.title && (
        <h3 className="font-heading text-sm font-medium">{step.title}</h3>
      )}
      <div className="text-xs/relaxed text-muted-foreground">
        {step.content}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div>
          {!isLastStep && (
            <Button variant="ghost" size="sm" {...skipProps}>
              {locale.skip}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button variant="outline" size="sm" {...backProps}>
              {locale.back}
            </Button>
          )}
          <Button size="sm" {...primaryProps}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
