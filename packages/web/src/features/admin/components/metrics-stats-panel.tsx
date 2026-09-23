import { getPublicMetrics } from "@/lib/api/admin";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function MetricsStatsPanel() {
  const { t } = useTranslation("admin");

  const metricsQuery = useQuery({
    queryKey: ["admin", "public-metrics"],
    queryFn: () => getPublicMetrics().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const data = metricsQuery.data;

  const tiles = [
    { labelKey: "metricsStats.totalScannedLabel", value: data?.totalScanned },
    { labelKey: "metricsStats.matchedLabel", value: data?.matched },
    { labelKey: "metricsStats.unidentifiedLabel", value: data?.unidentified },
    {
      labelKey: "metricsStats.matchRateLabel",
      value:
        data?.matchRate != null
          ? t("metricsStats.percentValue", { percent: data.matchRate })
          : "-",
    },
    {
      labelKey: "metricsStats.averageMatchPercentLabel",
      value:
        data?.averageMatchPercent != null
          ? t("metricsStats.percentValue", {
              percent: data.averageMatchPercent,
            })
          : "-",
    },
    { labelKey: "metricsStats.correctedLabel", value: data?.corrected },
    {
      labelKey: "metricsStats.multipleMatchesLabel",
      value: data?.multipleMatches,
    },
  ];

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{t("metricsStats.heading")}</p>
        <p className="text-xs text-muted-foreground">
          {t("metricsStats.description")}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <div key={tile.labelKey} className="rounded-lg bg-sidebar border p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {t(tile.labelKey)}
            </p>
            <p className="text-lg font-semibold">{tile.value ?? "-"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
