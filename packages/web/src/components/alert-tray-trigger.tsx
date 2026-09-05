import { DynamicPopover } from "@/components/ui/responsive-popover";
import { useAppAlertsContext } from "@/hooks/alerts/use-app-alerts";
import { ALERT_SEVERITY_ICON_CLASS, type AppAlert } from "@/lib/alerts";
import { cn } from "@/lib/utils";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

function TrayItem({ alert }: { alert: AppAlert }) {
  const Icon = alert.icon;

  return (
    <div className="flex items-start gap-2 rounded-md p-2 hover:bg-muted">
      <Icon
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          ALERT_SEVERITY_ICON_CLASS[alert.severity],
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-foreground">{alert.message}</span>
        {alert.actions && (
          <div className="flex flex-wrap gap-1">{alert.actions}</div>
        )}
      </div>
    </div>
  );
}

export function AlertTrayTrigger({
  trigger,
  side = "right",
  align = "start",
}: {
  trigger: (count: number) => ReactElement;
  side?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
  align?: "start" | "center" | "end";
}) {
  const { t } = useTranslation("common");
  const { trayAlerts } = useAppAlertsContext();

  return (
    <DynamicPopover
      side={side}
      align={align}
      contentClassName="w-80"
      trigger={trigger(trayAlerts.length)}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">{t("alerts.tray.title")}</span>
        <span className="text-muted-foreground">v{__APP_VERSION__}</span>
      </div>
      {trayAlerts.length === 0 ? (
        <p className="px-1 py-4 text-center text-muted-foreground">
          {t("alerts.tray.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {trayAlerts.map((alert) => (
            <TrayItem key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </DynamicPopover>
  );
}
