import { IdentifiableUnmatchedCardsPanel } from "@/features/scanner/components/identifiable-unmatched-cards-panel";
import { SessionErrorsPanel } from "@/features/scanner/components/session-errors-panel";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import { usePriceSource } from "@/hooks/use-price-source";
import type { MobileMonitorActivityProps } from "@/lib/interfaces/scanner";
import { EmptyState } from "@/components/empty-state";
import {
  MOBILE_LIST_CLASS,
  MOBILE_SECTION_CLASS,
  MOBILE_SECTION_LABEL_CLASS,
} from "@/lib/constants/nav";
import {
  IconActivity,
  IconChevronRight,
  IconSparkles,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { RECENT_SCANNED_CARDS_COUNT } from "@magic-vault/shared";

export function MobileMonitorActivity({
  session,
  stats,
  canEditCards,
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
      <EmptyState icon={IconActivity} title={t("mobileMonitor.noActivity")} />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <SessionErrorsPanel errors={errors} />
      {canEditCards ? (
        <IdentifiableUnmatchedCardsPanel cards={unmatchedCards} />
      ) : (
        <UnmatchedCardsPanel cards={unmatchedCards} />
      )}

      {recent.length > 0 && (
        <section className={MOBILE_SECTION_CLASS}>
          <h3 className={MOBILE_SECTION_LABEL_CLASS}>
            {t("recentScannedCards.heading")}
          </h3>
          <ul className={MOBILE_LIST_CLASS}>
            {recent.map((entry) => {
              const price = priceOf(entry.card, entry.isFoil);
              const content = (
                <>
                  <div className="relative aspect-[2.5/3.5] w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
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
                    <IconChevronRight className="size-4 shrink-0 text-foreground/70" />
                  )}
                </>
              );
              return (
                <li key={entry.scanId}>
                  {onOpenCard ? (
                    <button
                      type="button"
                      onClick={() => onOpenCard(entry.scanId)}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors active:bg-muted"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-2 py-2">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {stats?.mostValuable && (
        <section className={MOBILE_SECTION_CLASS}>
          <h3 className={MOBILE_SECTION_LABEL_CLASS}>{t("mostValuable")}</h3>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-foreground">
              {stats.mostValuable.name}
            </p>
            <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
              {format(stats.mostValuable.price)}
            </span>
          </div>
        </section>
      )}

      {hasRarities && (
        <section className={MOBILE_SECTION_CLASS}>
          <h3 className={MOBILE_SECTION_LABEL_CLASS}>{t("byRarity")}</h3>
          <div className="flex flex-col gap-2.5 py-1.5">
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
        </section>
      )}
    </div>
  );
}
