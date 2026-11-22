import { CompactPrice } from "@/components/compact-value";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { StatGroup } from "@/components/stat-group";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buyPerformanceQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { usePriceSource } from "@/hooks/use-price-source";
import { salesPath } from "@/lib/constants/business";
import type { BuyPerformanceSectionProps } from "@/lib/interfaces/business";
import { IconChevronRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function BuyPerformanceSection({ lot }: BuyPerformanceSectionProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const { access } = useBusinessAccess();
  const isVisible = lot.status === "accepted" && (access?.canViewCosts ?? false);
  const performance = useQuery(buyPerformanceQueryOptions(lot.guid, isVisible));

  if (!isVisible) return null;
  if (performance.isPending) return <Skeleton className="h-32 rounded-card" />;
  if (performance.isError || !performance.data) {
    return (
      <LoadErrorCallout
        message={t("errors.loadFailed")}
        onRetry={() => void performance.refetch()}
      />
    );
  }
  const data = performance.data;
  const toSales = salesPath(lot.guid);

  return (
    <div className="flex flex-col gap-2">
      <StatGroup
        heading={t("intake.performance.heading")}
        gridClassName="grid-cols-2 sm:grid-cols-4"
        tiles={[
          {
            key: "paid",
            label: t("intake.performance.paid"),
            value: data.paidTotal == null ? null : <CompactPrice value={data.paidTotal} />,
            detail: t("intake.cardCount", { count: data.cardCount }),
          },
          {
            key: "sold",
            to: toSales,
            label: t("intake.performance.sold"),
            value: data.soldCount,
            detail: t("intake.performance.soldDetail", { count: data.cardCount }),
          },
          {
            key: "revenue",
            to: toSales,
            label: t("intake.performance.revenue"),
            value: <CompactPrice value={data.revenue} />,
          },
          {
            key: "costOfSold",
            label: t("intake.performance.costOfSold"),
            value: <CompactPrice value={data.costOfSold} />,
          },
          {
            key: "profit",
            label: t("intake.performance.profit"),
            value: <CompactPrice value={data.profit} />,
          },
          {
            key: "paidBack",
            label: t("intake.performance.paidBack"),
            value:
              data.returnPercent == null
                ? null
                : t("intake.performance.percent", { value: data.returnPercent }),
            detail: t("intake.performance.paidBackDetail"),
          },
          {
            key: "remaining",
            label: t("intake.performance.remaining"),
            value: data.remainingCount,
            detail: t("intake.performance.remainingDetail", {
              cost: format(data.remainingCost),
              value: format(data.remainingSellValue),
            }),
          },
        ]}
      />
      <Button
        variant="outline"
        className="self-start"
        render={<Link to={toSales} />}
        nativeButton={false}
      >
        {t("intake.performance.seeSales")}
        <IconChevronRight />
      </Button>
    </div>
  );
}
