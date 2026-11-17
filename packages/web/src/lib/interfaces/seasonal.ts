import type { SPIDER_WEB_CORNER_CLASS } from "@/lib/constants/seasonal";

export type SpiderWebCorner = keyof typeof SPIDER_WEB_CORNER_CLASS;

export interface SpiderWebProps {
  corner: SpiderWebCorner;
  className?: string;
  withSpider?: boolean;
}

export interface SeasonalPumpkinProps {
  className?: string;
}
