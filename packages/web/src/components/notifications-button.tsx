import { AlertTrayTrigger } from "@/components/alert-tray-trigger";
import { Button } from "@/components/ui/button";
import { IconBell } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function NotificationsButton() {
  const { t } = useTranslation("common");

  return (
    <AlertTrayTrigger
      side="bottom"
      align="end"
      trigger={(count) => (
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={
            count > 0
              ? t("a11y.notificationsWithCount", { count })
              : t("alerts.tray.trigger")
          }
          className="relative"
        >
          <IconBell />
          {count > 0 && (
            <span className="absolute top-0 right-0 min-w-3.5 h-3.5 rounded-full bg-destructive px-0.5 text-2xs font-semibold leading-3.5 text-destructive-foreground ring-2 ring-sidebar max-md:top-1 max-md:right-1">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      )}
    />
  );
}
