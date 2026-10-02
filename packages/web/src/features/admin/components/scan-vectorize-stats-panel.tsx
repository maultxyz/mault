import { SettingsSection } from "@/components/settings-section";
import { getScanVectorizeStats } from "@/lib/api/admin";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function ScanVectorizeStatsPanel() {
  const { t } = useTranslation("admin");

  const statsQuery = useQuery({
    queryKey: ["admin", "scan-vectorize-stats"],
    queryFn: () => getScanVectorizeStats().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const server = statsQuery.data?.server ?? 0;
  const web = statsQuery.data?.web ?? 0;
  const total = server + web;

  return (
    <SettingsSection
      heading={t("scanVectorizeStats.heading")}
      description={t("scanVectorizeStats.description")}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border bg-muted p-3">
          <p className="text-2xs font-medium text-foreground/70 uppercase tracking-wide">
            {t("scanVectorizeStats.serverLabel")}
          </p>
          <p className="text-lg font-semibold">{server}</p>
          <p className="text-xs text-foreground/70">
            {total > 0
              ? t("scanVectorizeStats.percentOfTotal", {
                  percent: Math.round((server / total) * 100),
                })
              : "-"}
          </p>
        </div>
        <div className="rounded-md border bg-muted p-3">
          <p className="text-2xs font-medium text-foreground/70 uppercase tracking-wide">
            {t("scanVectorizeStats.webLabel")}
          </p>
          <p className="text-lg font-semibold">{web}</p>
          <p className="text-xs text-foreground/70">
            {total > 0
              ? t("scanVectorizeStats.percentOfTotal", {
                  percent: Math.round((web / total) * 100),
                })
              : "-"}
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
