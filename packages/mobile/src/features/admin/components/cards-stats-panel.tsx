import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { StatGroup } from "@/components/ui/stat-group";
import { StatTile } from "@/components/ui/stat-tile";
import { useCompactCount } from "@/hooks/use-compact-count";
import { activeScanningQueryOptions, scanMetricsQueryOptions, scanVectorizeStatsQueryOptions } from "@/features/admin/api/cards-stats";
import { ADMIN_DEFAULT_ACTIVE_SCANNING_WINDOW_MINUTES } from "@/lib/constants/admin-cards";
import { SPACING } from "@/lib/constants/theme";

export function CardsStatsPanel() {
  const { t } = useTranslation();
  const activeScanning = useQuery(activeScanningQueryOptions);
  const scanMetrics = useQuery(scanMetricsQueryOptions);
  const vectorizeStats = useQuery(scanVectorizeStatsQueryOptions);
  const minutes = activeScanning.data?.windowMinutes ?? ADMIN_DEFAULT_ACTIVE_SCANNING_WINDOW_MINUTES;
  const placeholder = t("admin.cards.stats.unknownValue");
  const compactCount = useCompactCount();
  const formatCount = (value: number | null | undefined) =>
    value != null ? compactCount(value) : { value: placeholder, exactValue: placeholder };
  const formatPercent = (value: number | null | undefined) => {
    const label = value != null ? t("admin.cards.stats.percentValue", { percent: value }) : placeholder;
    return { value: label, exactValue: label };
  };

  const activeTiles = (["scanners", "sessions", "orgs", "connectedSorters", "recentScans"] as const).map((key) => ({
    key,
    label: t(`admin.cards.stats.active.${key}`, { minutes }),
    ...formatCount(activeScanning.data?.[key]),
  }));

  const metrics = scanMetrics.data;
  const allTimeTiles = [
    { key: "totalScanned", ...formatCount(metrics?.totalScanned) },
    { key: "matched", ...formatCount(metrics?.matched) },
    { key: "unidentified", ...formatCount(metrics?.unidentified) },
    { key: "matchRate", ...formatPercent(metrics?.matchRate) },
    { key: "averageMatchPercent", ...formatPercent(metrics?.averageMatchPercent) },
    { key: "corrected", ...formatCount(metrics?.corrected) },
    { key: "multipleMatches", ...formatCount(metrics?.multipleMatches) },
  ];

  const vectorizeTotal = (vectorizeStats.data?.server ?? 0) + (vectorizeStats.data?.web ?? 0);
  const vectorizeTiles = (["server", "web"] as const).map((key) => {
    const count = vectorizeStats.data?.[key];
    return {
      key,
      label: t(`admin.cards.stats.vectorize.${key}`),
      ...formatCount(count),
      hint:
        count != null && vectorizeTotal > 0
          ? t("admin.cards.stats.vectorize.percentOfTotal", { percent: Math.round((count / vectorizeTotal) * 100) })
          : undefined,
    };
  });

  const hasError = activeScanning.isError || scanMetrics.isError || vectorizeStats.isError;

  return (
    <View style={{ gap: SPACING.md }}>
      <AppText size="xs" tone="secondary">
        {t("admin.cards.stats.description", { minutes })}
      </AppText>
      {hasError ? <Callout tone="destructive" title={t("admin.cards.stats.loadFailed")} /> : null}
      <StatGroup heading={t("admin.cards.stats.active.heading")}>
        {activeTiles.map((tile) => (
          <StatTile key={tile.key} label={tile.label} value={tile.value} exactValue={tile.exactValue} />
        ))}
      </StatGroup>
      <StatGroup heading={t("admin.cards.stats.allTime.heading")}>
        {allTimeTiles.map((tile) => (
          <StatTile
            key={tile.key}
            label={t(`admin.cards.stats.allTime.${tile.key}`)}
            value={tile.value}
            exactValue={tile.exactValue}
          />
        ))}
      </StatGroup>
      <StatGroup heading={t("admin.cards.stats.vectorize.heading")}>
        {vectorizeTiles.map((tile) => (
          <StatTile key={tile.key} label={tile.label} value={tile.value} exactValue={tile.exactValue} hint={tile.hint} />
        ))}
      </StatGroup>
    </View>
  );
}
