import { SettingsSection } from "@/components/settings-section";
import { AdminStatGroup } from "@/features/admin/components/admin-stat-group";
import {
  getActiveScanning,
  getPublicMetrics,
  getScanVectorizeStats,
} from "@/lib/api/admin";
import {
  ACTIVE_SCANNING_REFRESH_MS,
  PUBLIC_METRICS_REFRESH_MS,
  SCAN_VECTORIZE_STATS_REFRESH_MS,
} from "@/lib/constants/admin";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function ScanStatsOverviewPanel() {
  const { t } = useTranslation("admin");

  const { data: active } = useQuery({
    queryKey: ["admin", "active-scanning"],
    queryFn: () => getActiveScanning().then((r) => r.data),
    refetchInterval: ACTIVE_SCANNING_REFRESH_MS,
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin", "public-metrics"],
    queryFn: () => getPublicMetrics().then((r) => r.data),
    refetchInterval: PUBLIC_METRICS_REFRESH_MS,
  });

  const { data: vectorize } = useQuery({
    queryKey: ["admin", "scan-vectorize-stats"],
    queryFn: () => getScanVectorizeStats().then((r) => r.data),
    refetchInterval: SCAN_VECTORIZE_STATS_REFRESH_MS,
  });

  const minutes = active?.windowMinutes ?? 5;
  const percent = (value: number | null | undefined) =>
    value != null ? t("metricsStats.percentValue", { percent: value }) : null;

  const activeTiles = (
    [
      ["scanners", active?.scanners],
      ["sessions", active?.sessions],
      ["orgs", active?.orgs],
      ["connectedSorters", active?.connectedSorters],
      ["recentScans", active?.recentScans],
    ] as const
  ).map(([key, value]) => ({
    key,
    label: t(`activeScanning.${key}`, { minutes }),
    value,
  }));

  const allTimeTiles = [
    { key: "totalScanned", value: metrics?.totalScanned },
    { key: "matched", value: metrics?.matched },
    { key: "unidentified", value: metrics?.unidentified },
    { key: "matchRate", value: percent(metrics?.matchRate) },
    {
      key: "averageMatchPercent",
      value: percent(metrics?.averageMatchPercent),
    },
    { key: "corrected", value: metrics?.corrected },
    { key: "multipleMatches", value: metrics?.multipleMatches },
  ].map((tile) => ({
    ...tile,
    label: t(`metricsStats.${tile.key}Label`),
  }));

  const vectorizeTotal = (vectorize?.server ?? 0) + (vectorize?.web ?? 0);
  const vectorizeTiles = (["server", "web"] as const).map((key) => {
    const count = vectorize?.[key];
    return {
      key,
      label: t(`scanVectorizeStats.${key}Label`),
      value: count,
      detail:
        count != null && vectorizeTotal > 0
          ? t("scanVectorizeStats.percentOfTotal", {
              percent: Math.round((count / vectorizeTotal) * 100),
            })
          : null,
    };
  });

  return (
    <SettingsSection
      heading={t("metricsStats.heading")}
      description={t("metricsStats.description", { minutes })}
    >
      <div className="flex flex-col gap-3">
        <AdminStatGroup
          heading={t("activeScanning.heading")}
          tiles={activeTiles}
          live={(active?.scanners ?? 0) > 0}
        />
        <AdminStatGroup
          heading={t("metricsStats.allTimeHeading")}
          tiles={allTimeTiles}
        />
        <AdminStatGroup
          heading={t("scanVectorizeStats.heading")}
          tiles={vectorizeTiles}
        />
      </div>
    </SettingsSection>
  );
}
