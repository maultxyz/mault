import { Callout } from "@/components/callout";
import { CompactCount, CompactPrice } from "@/components/compact-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { ScannerBuyRecentCards } from "@/features/business/components/scanner-buy-recent-cards";
import { usePriceSource } from "@/hooks/use-price-source";
import { intakeLotPath } from "@/lib/constants/business";
import type { ScannerBuyOverviewProps } from "@/lib/interfaces/business";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function ScannerBuyOverview({
  state,
  editsOffers,
  onOpenDialog,
  headingLevel = "h2",
  headerAction,
}: ScannerBuyOverviewProps) {
  const { t } = useTranslation(["business", "common"]);
  const { format } = usePriceSource();
  const { access, settings } = useBusinessAccess();
  const { lot, belowMinimumScanIds } = state;
  if (!lot) return null;

  const Heading = headingLevel;
  const usesOffers = lot.sourceType !== "opened";
  const showsMoney = access?.canViewCosts ?? false;
  const canAccept = access?.canAcceptIntake ?? false;
  const minCardValue = settings?.buylist.minCardValue ?? 0;
  const stats = [
    { key: "cards", label: t("intake.stats.cards"), value: <CompactCount value={lot.cardCount} /> },
    ...(showsMoney
      ? [
          {
            key: "market",
            label: t("intake.stats.market"),
            value: lot.marketTotal != null ? <CompactPrice value={lot.marketTotal} /> : "-",
          },
          ...(usesOffers
            ? [
                {
                  key: "cash",
                  label: t("intake.stats.cash"),
                  value: lot.cashOffer != null ? <CompactPrice value={lot.cashOffer} /> : "-",
                },
              ]
            : []),
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3 md:gap-2">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-success animate-pulse motion-reduce:animate-none"
            />
            <Heading className="truncate font-heading text-base font-semibold text-foreground md:text-sm">
              {t("banner.title", { name: lot.customerName })}
            </Heading>
            <Badge variant="outline">{t(`intake.sourceTypes.${lot.sourceType}`)}</Badge>
            <span className="sr-only">{t("common:a11y.live")}</span>
          </div>
          <p className="truncate text-xs text-foreground/70">
            {t("banner.description", { collection: lot.collectionName })}
          </p>
        </div>
        <dl data-tour="scanner-buy-totals" className="flex items-start gap-5 md:gap-4">
          {stats.map((stat) => (
            <div key={stat.key} className="text-right">
              <dt className="text-2xs text-foreground/70">{stat.label}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
        {headerAction}
      </div>
      {usesOffers && belowMinimumScanIds.length > 0 && (
        <Callout
          variant="warning"
          icon={IconAlertTriangle}
          action={
            <Button
              variant="outline"
              onClick={() =>
                onOpenDialog({ kind: "remove", lot, scanIds: belowMinimumScanIds })
              }
            >
              <IconX />
              {t("intake.belowMinimum.remove", { count: belowMinimumScanIds.length })}
            </Button>
          }
        >
          {t("intake.belowMinimum.notice", {
            count: belowMinimumScanIds.length,
            value: format(minCardValue),
          })}
        </Callout>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {canAccept && (
          <Button
            data-tour="scanner-buy-finish"
            disabled={lot.cardCount === 0}
            onClick={() => onOpenDialog({ kind: "finish", lot })}
          >
            <IconCheck />
            {t("scannerBuy.finish")}
          </Button>
        )}
        <Button variant="outline" render={<Link to={intakeLotPath(lot.guid)} />}>
          {t("banner.open")}
          <IconArrowRight />
        </Button>
        {canAccept && (
          <Button
            variant="ghost"
            onClick={() => onOpenDialog({ kind: "cancel", lot })}
          >
            <IconX />
            {t("intake.cancelLot")}
          </Button>
        )}
      </div>
      <ScannerBuyRecentCards lot={lot} editsOffers={editsOffers} />
    </div>
  );
}
