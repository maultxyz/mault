import { Button } from "@/components/ui/button";
import { ALERT_SEVERITY_BANNER_CLASS, type AppAlert } from "@/lib/alerts";
import { cn } from "@/lib/utils";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function AlertBanner({
  alert,
  onDismiss,
}: {
  alert: AppAlert;
  onDismiss: () => void;
}) {
  const { t } = useTranslation("common");
  const Icon = alert.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 border-b px-4 py-1.5 text-xs",
        ALERT_SEVERITY_BANNER_CLASS[alert.severity],
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span>{alert.message}</span>
      {alert.actions}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onDismiss}
        aria-label={t("alerts.dismiss")}
        className="shrink-0 text-current hover:bg-black/10 dark:hover:bg-white/10"
      >
        <IconX className="size-3" />
      </Button>
    </div>
  );
}
