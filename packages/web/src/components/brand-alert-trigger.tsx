import { AlertTrayTrigger } from "@/components/alert-tray-trigger";
import { BrandIcon } from "@/components/brand-icon";
import { useTranslation } from "react-i18next";

export function BrandAlertTrigger() {
  const { t } = useTranslation("common");

  return (
    <AlertTrayTrigger
      side="bottom"
      align="start"
      trigger={(count) => (
        <button
          type="button"
          aria-label={t("alerts.tray.trigger")}
          className="relative grid size-6.5 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <BrandIcon className="size-5.5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 rounded-full bg-destructive px-0.5 text-2xs font-semibold leading-3.5 text-destructive-foreground ring-2 ring-sidebar">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      )}
    />
  );
}
