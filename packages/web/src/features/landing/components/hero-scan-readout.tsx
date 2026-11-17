import { useCountUp } from "@/hooks/use-count-up";
import { useTypewriter } from "@/hooks/use-typewriter";
import {
  HERO_MATCH_COUNT_UP_MS,
  HERO_READOUT_ROW_DELAY_MS,
  HERO_READOUT_ROW_STAGGER_MS,
  HERO_READOUT_TYPING_MS_PER_CHARACTER,
} from "@/lib/constants/landing";
import { formatUsd } from "@/lib/format";
import type { HeroScanReadoutProps } from "@/lib/interfaces/landing";
import { matchPercent } from "@/lib/utils";
import { IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function HeroScanReadout({ scannedCard }: HeroScanReadoutProps) {
  const { t } = useTranslation("landing");
  const { t: tBins } = useTranslation("bins");
  const { card, binNumber, isFoil } = scannedCard;
  const typedName = useTypewriter(
    card.name,
    true,
    HERO_READOUT_TYPING_MS_PER_CHARACTER,
  );
  const countedMatch = useCountUp(
    matchPercent(card),
    true,
    HERO_MATCH_COUNT_UP_MS,
  );
  const price = (isFoil ? card.priceFoil : card.price) ?? card.price;
  const readoutRows = [
    { key: "match", value: `${countedMatch.toFixed(1)}%`, isHighlighted: true },
    {
      key: "set",
      value: `${card.set.toUpperCase()} #${card.collectorNumber}`,
    },
    ...(price != null ? [{ key: "price", value: formatUsd(price) }] : []),
    {
      key: "route",
      value: `→ ${tBins("binLabel", { number: binNumber })}`,
      isHighlighted: true,
    },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="min-h-10">
        <p className="text-sm font-semibold leading-tight text-balance">
          {typedName}
          {typedName !== card.name && (
            <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-primary motion-reduce:animate-none" />
          )}
        </p>
        {isFoil && (
          <p className="mt-1 flex items-center gap-1 text-2xs text-foreground/70">
            <IconSparkles className="size-3" />
            {t("hero.foil")}
          </p>
        )}
      </div>
      <dl className="flex flex-col font-heading text-2xs tabular-nums">
        {readoutRows.map((row, index) => (
          <div
            key={row.key}
            style={{
              animationDelay: `${HERO_READOUT_ROW_DELAY_MS + index * HERO_READOUT_ROW_STAGGER_MS}ms`,
            }}
            className="flex items-center justify-between gap-3 border-b py-1.5 first:border-t animate-in fade-in slide-in-from-left-2 duration-300 [animation-fill-mode:both] motion-reduce:animate-none"
          >
            <dt className="tracking-widest text-foreground/70 uppercase">
              {t(`hero.readout.${row.key}`)}
            </dt>
            <dd
              className={
                row.isHighlighted ? "font-semibold text-primary" : undefined
              }
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
