import { valueChangeOf } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useOrg } from "@/features/companies/api/use-organization";
import { widgetSummaryWithCollectionsQueryOptions } from "@/features/home/api/widget-summary";
import { usePriceSource } from "@/hooks/use-price-source";
import type { CollectionChangeSummary } from "@/lib/interfaces/library";

export function useCollectionChanges(enabled: boolean) {
  const { t, i18n } = useTranslation("home");
  const { activeOrg } = useOrg();
  const { format, formatCompact } = usePriceSource();
  const { data, isLoading } = useQuery({
    ...widgetSummaryWithCollectionsQueryOptions(activeOrg?.id),
    enabled: enabled && !!activeOrg?.id,
  });
  const trendsByGuid = new Map((data?.collections ?? []).map((trend) => [trend.guid, trend]));
  return (guid: string): CollectionChangeSummary => {
    const trend = trendsByGuid.get(guid);
    const change = trend
      ? valueChangeOf(trend, formatCompact, i18n.language)
      : null;
    const exactChange = trend
      ? valueChangeOf(trend, format, i18n.language)
      : null;
    return {
      values: trend ? [...trend.valueHistory.map((point) => point.totalValue), trend.totalValue] : [],
      baseline: trend?.previousValue ?? null,
      change,
      label: exactChange
        ? `${exactChange.change}, ${exactChange.percent}`
        : t("library.noChange"),
      isLoading,
    };
  };
}
