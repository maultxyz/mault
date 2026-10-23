import { SPIDER_WEB_CORNER_CLASS } from "@/lib/constants/seasonal";
import type {
  SeasonalPumpkinProps,
  SpiderWebProps,
} from "@/lib/interfaces/seasonal";
import { SPIDER_WEB_PATH, isHalloweenSeason } from "@/lib/seasonal";
import { cn } from "@/lib/utils";
import { IconPumpkinScary, IconSpider } from "@tabler/icons-react";

export function SpiderWeb({ corner, className, withSpider }: SpiderWebProps) {
  if (!isHalloweenSeason()) return null;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none select-none absolute z-999 size-20 text-foreground/25",
        SPIDER_WEB_CORNER_CLASS[corner],
        className,
      )}
    >
      <svg viewBox="0 0 100 100" className="size-full overflow-visible">
        <path
          d={SPIDER_WEB_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {withSpider && (
        <div className="absolute top-[58%] left-[58%] flex flex-col items-center">
          <span className="h-6 w-px bg-current" />
          <IconSpider className="size-3 -mt-0.5 text-foreground/45" />
        </div>
      )}
    </div>
  );
}

export function SeasonalPumpkin({ className }: SeasonalPumpkinProps) {
  if (!isHalloweenSeason()) return null;
  return (
    <IconPumpkinScary
      aria-hidden
      className={cn("pointer-events-none shrink-0 text-warning", className)}
    />
  );
}
