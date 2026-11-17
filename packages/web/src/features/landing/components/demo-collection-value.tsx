import { DemoCountedPrice } from "@/features/landing/components/demo-counted-price";
import {
  DEMO_CHART_HEIGHT,
  DEMO_CHART_WIDTH,
  DEMO_COLLECTION_RARITY_VALUES,
  DEMO_COLLECTION_VALUE_HISTORY,
  DEMO_REVEAL_STAGGER_MS,
} from "@/lib/constants/landing";
import { raritySwatch } from "@/lib/card-swatches";
import type { FeatureSpotlightDemoProps } from "@/lib/interfaces/landing";
import { cn } from "@/lib/utils";
import { formatPrice, rarityLabel } from "@magic-vault/shared";
import { IconTrendingUp } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DemoCollectionValue({ isRevealed }: FeatureSpotlightDemoProps) {
  const { t } = useTranslation("landing");
  const firstValue = DEMO_COLLECTION_VALUE_HISTORY[0];
  const latestValue = DEMO_COLLECTION_VALUE_HISTORY.at(-1) ?? firstValue;
  const changePercent = ((latestValue - firstValue) / firstValue) * 100;
  const minValue = Math.min(...DEMO_COLLECTION_VALUE_HISTORY);
  const maxValue = Math.max(...DEMO_COLLECTION_VALUE_HISTORY);
  const chartPoints = DEMO_COLLECTION_VALUE_HISTORY.map((value, index) => ({
    x: (index / (DEMO_COLLECTION_VALUE_HISTORY.length - 1)) * DEMO_CHART_WIDTH,
    y:
      DEMO_CHART_HEIGHT -
      ((value - minValue) / (maxValue - minValue)) * (DEMO_CHART_HEIGHT - 8) -
      4,
  }));
  const linePoints = chartPoints.map(({ x, y }) => `${x},${y}`).join(" ");
  const areaPoints = `0,${DEMO_CHART_HEIGHT} ${linePoints} ${DEMO_CHART_WIDTH},${DEMO_CHART_HEIGHT}`;
  const largestRarityValue = Math.max(
    ...DEMO_COLLECTION_RARITY_VALUES.map(({ value }) => value),
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-foreground/70">
            {t("features.demo.collectionValue")}
          </p>
          <DemoCountedPrice
            value={latestValue}
            isRevealed={isRevealed}
            className="block font-heading text-3xl font-semibold tracking-tight tabular-nums"
          />
        </div>
        <span className="flex items-center gap-1 rounded-sm border border-success px-1.5 py-0.5 font-heading text-sm font-medium text-success-foreground tabular-nums">
          <IconTrendingUp className="size-4" />+{changePercent.toFixed(1)}%
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <svg
          viewBox={`0 0 ${DEMO_CHART_WIDTH} ${DEMO_CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-24 w-full overflow-visible"
          role="img"
          aria-label={t("features.demo.valueHistory")}
        >
          <polygon
            points={areaPoints}
            className={cn(
              "fill-primary/10 transition-opacity delay-700 duration-1000 motion-reduce:transition-none",
              isRevealed ? "opacity-100" : "opacity-0",
            )}
          />
          <polyline
            points={linePoints}
            fill="none"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={isRevealed ? 0 : 1}
            className="stroke-primary transition-[stroke-dashoffset] duration-[1600ms] ease-out motion-reduce:transition-none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p className="text-sm text-foreground/70">
          {t("features.demo.valueHistory")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {DEMO_COLLECTION_RARITY_VALUES.map(({ rarity, value }, index) => (
          <div key={rarity} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0">{rarityLabel(rarity)}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full origin-left rounded-full transition-transform duration-1000 ease-out motion-reduce:transition-none"
                style={{
                  backgroundColor: raritySwatch(rarity).bg,
                  transform: `scaleX(${isRevealed ? value / largestRarityValue : 0})`,
                  transitionDelay: `${400 + index * DEMO_REVEAL_STAGGER_MS}ms`,
                }}
              />
            </span>
            <span className="shrink-0 text-right font-medium whitespace-nowrap tabular-nums">
              {formatPrice(value, "tcgplayer")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
