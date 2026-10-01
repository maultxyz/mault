import { SessionErrorsPanel } from "@/features/scanner/components/session-errors-panel";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import { DetailSection } from "@/features/cards/components/detail-section";
import { usePriceSource } from "@/hooks/use-price-source";
import { RECENT_SCANNED_CARDS_COUNT } from "@/lib/constants/limits";
import type { MobileMonitorActivityProps } from "@/lib/interfaces/scanner";
import { IconChevronRight, IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileMonitorActivity({
  session,
  stats,
  onOpenCard,
}: MobileMonitorActivityProps) {
  const { t } = useTranslation("scanner");
  const { priceOf, format } = usePriceSource();
  const { recentCards, unmatchedCards, errors } = session;
  const recent = recentCards.slice(0, RECENT_SCANNED_CARDS_COUNT);
  const hasRarities = !!stats && stats.rarities.length > 0;
  const isEmpty =
    recent.length === 0 &&
    unmatchedCards.length === 0 &&
    errors.length === 0 &&
    !hasRarities;

  if (isEmpty) {
    return (
      <p className="px-6 py-16 text-center text-sm text-foreground/70">
        {t("mobileMonitor.noActivity")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-3">
      <SessionErrorsPanel errors={errors} />
      <UnmatchedCardsPanel cards={unmatchedCards} />

      {recent.length > 0 && (
        <DetailSection title={t("recentScannedCards.heading")}>
          <ul className="flex flex-col divide-y rounded-lg border">
            {recent.map((entry) => {
              const price = priceOf(entry.card, entry.isFoil);
              const content = (
                <>
                  <div className="relative aspect-[2.5/3.5] w-10 shrink-0 overflow-hidden rounded border bg-muted">
                    <img
                      src={
                        entry.card.image?.small ||
                        entry.card.image?.normal ||
                        ""
                      }
                      alt={entry.card.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {entry.isFoil && (
                      <span className="absolute top-0.5 left-0.5 rounded-full bg-gradient-to-br from-fuchsia-400 via-cyan-400 to-amber-300 p-0.5">
                        <IconSparkles className="size-2 text-white" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {entry.card.name}
                    </p>
                    <p className="truncate text-xs text-foreground/70">
                      {[
                        entry.binNumber != null
                          ? t("mobileMonitor.bin", { number: entry.binNumber })
                          : null,
                        new Date(entry.scannedAt).toLocaleTimeString(
                          undefined,
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        ),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {price != null && (
                    <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">
                      {format(price)}
                    </span>
                  )}
                  {onOpenCard && (
                    <IconChevronRight className="size-4 shrink-0 text-foreground/50" />
                  )}
                </>
              );
              return (
                <li key={entry.scanId}>
                  {onOpenCard ? (
                    <button
                      type="button"
                      onClick={() => onOpenCard(entry.scanId)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left active:bg-muted"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </DetailSection>
      )}

      {stats?.mostValuable && (
        <DetailSection title={t("mostValuable")}>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">
              {stats.mostValuable.name}
            </p>
            <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
              {format(stats.mostValuable.price)}
            </span>
          </div>
        </DetailSection>
      )}

      {hasRarities && (
        <DetailSection title={t("byRarity")}>
          <div className="flex flex-col gap-2 rounded-lg border px-3 py-2.5">
            {stats.rarities.map((rarity) => (
              <div
                key={rarity.key}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: `var(--${rarity.key})` }}
                  />
                  <span className="text-foreground">{rarity.label}</span>
                </div>
                <span className="text-foreground/70 tabular-nums">
                  {rarity.count}
                </span>
              </div>
            ))}
          </div>
        </DetailSection>
      )}
    </div>
  );
}
