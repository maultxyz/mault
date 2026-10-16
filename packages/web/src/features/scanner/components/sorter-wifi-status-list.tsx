import type { SorterWifiStatusListProps } from "@/lib/interfaces/sorter-wifi";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function SorterWifiStatusList({ status }: SorterWifiStatusListProps) {
  const { t } = useTranslation("scanner");

  const wifiDot =
    status?.wifi === "connected"
      ? "bg-success"
      : status?.wifi === "paused"
        ? "bg-destructive"
        : status?.wifi === "connecting"
          ? "bg-warning"
          : "bg-foreground/30";
  const cloudDot =
    status?.cloud === "connected"
      ? "bg-success"
      : status?.cloud === "rejected"
        ? "bg-destructive"
        : status?.cloud === "connecting" || status?.cloud === "offline"
          ? "bg-warning"
          : "bg-foreground/30";

  const wifiDetail =
    status?.wifi === "connected"
      ? [status.ssid, status.ip].filter(Boolean).join(" · ")
      : (status?.ssid ?? null);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="flex flex-col gap-1 rounded-md border bg-muted px-3 py-2">
        <span className="text-2xs font-medium uppercase tracking-wide text-foreground/70">
          {t("sorterWifi.wifiLabel")}
        </span>
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className={cn("size-2 shrink-0 rounded-full", wifiDot)} />
          {status
            ? t(`sorterWifi.wifiState.${status.wifi}`)
            : t("sorterWifi.unknown")}
        </span>
        {wifiDetail && (
          <span className="truncate text-xs text-foreground/70">
            {wifiDetail}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 rounded-md border bg-muted px-3 py-2">
        <span className="text-2xs font-medium uppercase tracking-wide text-foreground/70">
          {t("sorterWifi.cloudLabel")}
        </span>
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className={cn("size-2 shrink-0 rounded-full", cloudDot)} />
          {status
            ? t(`sorterWifi.cloudState.${status.cloud}`)
            : t("sorterWifi.unknown")}
        </span>
        {status?.host && (
          <span className="truncate text-xs text-foreground/70">
            {status.host}
          </span>
        )}
      </div>
    </div>
  );
}
