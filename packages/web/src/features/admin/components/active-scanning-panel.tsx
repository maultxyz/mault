import { SettingsSection } from "@/components/settings-section";
import { getActiveScanning } from "@/lib/api/admin";
import { ACTIVE_SCANNING_REFRESH_MS } from "@/lib/constants/admin";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function ActiveScanningPanel() {
  const { t } = useTranslation("admin");

  const { data } = useQuery({
    queryKey: ["admin", "active-scanning"],
    queryFn: () => getActiveScanning().then((r) => r.data),
    refetchInterval: ACTIVE_SCANNING_REFRESH_MS,
  });

  const windowMinutes = data?.windowMinutes ?? 5;
  const tiles = [
    { key: "scanners", value: data?.scanners },
    { key: "sessions", value: data?.sessions },
    { key: "orgs", value: data?.orgs },
    { key: "connectedSorters", value: data?.connectedSorters },
    { key: "recentScans", value: data?.recentScans },
  ] as const;

  return (
    <SettingsSection
      heading={t("activeScanning.heading")}
      description={t("activeScanning.description", { minutes: windowMinutes })}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.key} className="rounded-md border bg-muted p-3">
            <p className="text-2xs font-medium text-foreground/70 uppercase tracking-wide">
              {t(`activeScanning.${tile.key}`, { minutes: windowMinutes })}
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {tile.value ?? "-"}
            </p>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
