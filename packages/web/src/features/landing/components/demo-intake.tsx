import { DemoCountedPrice } from "@/features/landing/components/demo-counted-price";
import { DEMO_SCANNED_CARDS } from "@/features/landing/lib/demo-cards";
import {
  DEMO_INTAKE_CREDIT_BONUS,
  DEMO_INTAKE_CUSTOMER,
  DEMO_INTAKE_ROWS,
  DEMO_REVEAL_STAGGER_MS,
  FEATURE_REVEAL_HIDDEN_CLASS,
} from "@/lib/constants/landing";
import type { FeatureSpotlightDemoProps } from "@/lib/interfaces/landing";
import { cn } from "@/lib/utils";
import { formatPrice } from "@magic-vault/shared";
import { IconCash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DemoIntake({ isRevealed }: FeatureSpotlightDemoProps) {
  const { t } = useTranslation("landing");
  const cash = DEMO_INTAKE_ROWS.reduce(
    (sum, row) => sum + (row.declined ? 0 : row.offer),
    0,
  );
  const credit = cash * (1 + DEMO_INTAKE_CREDIT_BONUS / 100);
  const strikeDelayMs = DEMO_INTAKE_ROWS.length * DEMO_REVEAL_STAGGER_MS + 400;

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <IconCash className="size-4 text-primary" />
          {t("features.demo.intakeLot", { name: DEMO_INTAKE_CUSTOMER })}
        </span>
        <span className="flex items-center gap-1.5 text-foreground/70">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          {t("features.demo.liveOffer")}
        </span>
      </div>
      <div className="flex flex-col divide-y overflow-hidden rounded-lg border bg-background">
        {DEMO_INTAKE_ROWS.map((row, index) => {
          const { card } = DEMO_SCANNED_CARDS[row.cardIndex];
          return (
            <div
              key={card.id}
              style={{ animationDelay: `${index * DEMO_REVEAL_STAGGER_MS}ms` }}
              className={cn(
                "relative flex items-center gap-2.5 p-1.5 pr-3 text-sm",
                isRevealed
                  ? "animate-in fade-in slide-in-from-left-4 duration-500 [animation-fill-mode:both] motion-reduce:animate-none"
                  : FEATURE_REVEAL_HIDDEN_CLASS,
                row.declined && "text-foreground/70",
              )}
            >
              <img
                src={card.image?.small ?? ""}
                alt=""
                className="aspect-5/7 w-8 shrink-0 rounded-sm object-cover"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{card.name}</span>
                <span className="text-xs tabular-nums text-foreground/70 sm:hidden">
                  {formatPrice(row.market, "tcgplayer")}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-foreground/70 max-sm:hidden">
                {formatPrice(row.market, "tcgplayer")}
              </span>
              <span className="min-w-20 shrink-0 text-right font-semibold whitespace-nowrap tabular-nums">
                {formatPrice(row.offer, "tcgplayer")}
              </span>
              {row.declined && isRevealed && (
                <span
                  style={{ animationDelay: `${strikeDelayMs}ms` }}
                  className="absolute inset-x-12 top-1/2 h-px origin-left bg-foreground/70 animate-[wrapped-progress_500ms_ease-out_both] motion-reduce:animate-none"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-sm">
        <div className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-2">
          <p className="text-foreground/70">{t("features.demo.cash")}</p>
          <DemoCountedPrice
            value={cash}
            isRevealed={isRevealed}
            className="block font-heading text-lg font-semibold tabular-nums"
          />
        </div>
        <div className="rounded-lg border border-input bg-background px-3 py-2">
          <p className="text-foreground/70">{t("features.demo.credit")}</p>
          <DemoCountedPrice
            value={credit}
            isRevealed={isRevealed}
            className="block font-heading text-lg font-semibold tabular-nums"
          />
        </div>
      </div>
    </div>
  );
}
