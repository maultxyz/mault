import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { ListSkeleton } from "@/components/list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fleetQueryOptions,
  markDeviceServiced,
} from "@/features/business/api/business";
import {
  useBusinessAccess,
  useBusinessAction,
} from "@/features/business/api/use-business";
import { ServiceIntervalDialog } from "@/features/business/components/service-interval-dialog";
import { formatDateTime } from "@/features/business/lib/format";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { FLEET_ALERTS_PAGE_SIZE } from "@/lib/constants/pagination";
import { cn } from "@/lib/utils";
import type { DeviceHealth } from "@magic-vault/shared";
import { IconBellRinging, IconSettings, IconTool } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function FleetHealthPanel() {
  const { t } = useTranslation("business");
  const { orgId, access } = useBusinessAccess();
  const run = useBusinessAction();
  const { data: fleet, isLoading } = useQuery(fleetQueryOptions(orgId));
  const [intervalTarget, setIntervalTarget] = useState<DeviceHealth | null>(null);
  const alertsPagination = useClientPagination(
    fleet?.alerts ?? [],
    FLEET_ALERTS_PAGE_SIZE,
  );

  if (isLoading || !fleet) return <ListSkeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-sm font-semibold">{t("fleet.title")}</h2>
        <p className="text-xs text-foreground/70">{t("fleet.description")}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {fleet.devices.map((device) => {
          const interval = device.maintenanceIntervalCards;
          const progress = interval
            ? Math.min(device.cardsSinceService / interval, 1)
            : null;
          return (
            <div key={device.guid} className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-heading text-sm font-medium">
                  {device.name}
                </p>
                {device.isConnected ? (
                  <Badge variant="success">{t("fleet.connected")}</Badge>
                ) : (
                  <Badge variant="outline">{t("fleet.offline")}</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-foreground/70">{t("fleet.cardsSorted")}</p>
                  <p className="font-semibold tabular-nums">
                    {device.cardsSorted.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-foreground/70">{t("fleet.lastSeen")}</p>
                  <p className="font-semibold">{formatDateTime(device.lastSeenAt)}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/70">{t("fleet.sinceService")}</span>
                  <span className="tabular-nums">
                    {interval
                      ? `${device.cardsSinceService.toLocaleString()} / ${interval.toLocaleString()}`
                      : device.cardsSinceService.toLocaleString()}
                  </span>
                </div>
                {progress !== null && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        device.serviceDue ? "bg-warning" : "bg-primary",
                      )}
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                )}
                <p className="text-2xs text-foreground/70">
                  {device.lastServicedAt
                    ? t("fleet.lastServiced", {
                        date: formatDateTime(device.lastServicedAt),
                      })
                    : t("fleet.neverServiced")}
                </p>
              </div>
              {device.recentAlerts.length > 0 && (
                <ul className="flex flex-col gap-1 text-xs">
                  {device.recentAlerts.slice(0, 3).map((alert) => (
                    <li key={alert.guid} className="flex items-center gap-1.5">
                      <IconBellRinging className="size-3 shrink-0 text-foreground/70" />
                      <span className="min-w-0 flex-1 truncate">{alert.title}</span>
                      <span className="shrink-0 text-foreground/70">
                        {formatDateTime(alert.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex gap-1.5">
                <Button
                  variant={device.serviceDue ? "default" : "outline"}
                  className="flex-1"
                  onClick={() =>
                    void run(
                      () => markDeviceServiced(device.guid),
                      t("fleet.serviced"),
                    )
                  }
                >
                  <IconTool />
                  {t("fleet.markServiced")}
                </Button>
                {access?.canManageSettings && (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("fleet.intervalTitle")}
                    title={t("fleet.intervalTitle")}
                    onClick={() => setIntervalTarget(device)}
                  >
                    <IconSettings />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold">{t("fleet.alerts")}</h2>
        {fleet.alerts.length === 0 ? (
          <EmptyState
            size="compact"
            icon={IconBellRinging}
            title={t("fleet.noAlerts")}
            description={t("fleet.noAlertsDescription")}
          />
        ) : (
          <>
            <div className="flex flex-col divide-y rounded-lg border">
              {alertsPagination.pageItems.map((alert) => (
                <div key={alert.guid} className="flex flex-col gap-0.5 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.type === "maintenance" ? "outline" : "destructive"}>
                      {t(`fleet.types.${alert.type}`)}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {alert.title}
                    </span>
                    <span className="shrink-0 text-xs text-foreground/70">
                      {formatDateTime(alert.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-xs text-foreground/70">
                    {alert.deviceName ? `${alert.deviceName}: ` : ""}
                    {alert.description.replace(/\*\*/g, "")}
                  </p>
                </div>
              ))}
            </div>
            <ListPagination pagination={alertsPagination} />
          </>
        )}
      </section>

      <ServiceIntervalDialog
        device={intervalTarget}
        onOpenChange={(open) => !open && setIntervalTarget(null)}
      />
    </div>
  );
}
