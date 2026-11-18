import { PI_REBOOT_COMMAND } from "@/lib/constants/pi-update";
import type { AppAlert } from "@/lib/interfaces/alerts";
import type { PiUpdateControls } from "@/lib/interfaces/pi-update";
import { IconRefreshAlert } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function usePiRebootAlert(update: PiUpdateControls): AppAlert | null {
  const { t } = useTranslation("common");
  const status = update.status;
  if (!status?.rebootRequired || update.busy) return null;

  return {
    id: `pi-reboot-required-${status.bootId ?? "unknown"}`,
    severity: "warning",
    icon: IconRefreshAlert,
    message: (
      <>
        {t("piReboot.banner")}
        <span className="block">
          {t("piReboot.command")}{" "}
          <code className="select-all">{PI_REBOOT_COMMAND}</code>
        </span>
      </>
    ),
  };
}
