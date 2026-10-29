import { Button } from "@/components/ui/button";
import { useAppVersionCheck } from "@/hooks/use-app-version-check";
import { usePiHost } from "@/hooks/use-pi-host";
import { usePiUpdate } from "@/hooks/use-pi-update";
import { useRole } from "@/hooks/use-role";
import { ALERT_BANNER_ACTION_CLASS } from "@/lib/constants/colors";
import { PI_UPDATE_ACKNOWLEDGED_KEY } from "@/lib/constants/pi-update";
import type { AppAlert } from "@/lib/interfaces/alerts";
import { hardReload } from "@/lib/pwa";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function useAppVersionAlert(): AppAlert | null {
  const { t } = useTranslation("common");
  const isOutdated = useAppVersionCheck();
  const piHost = usePiHost();
  const { isAdmin } = useRole();
  const update = usePiUpdate(piHost && isAdmin);
  const [acknowledged] = useState(() => {
    try {
      return localStorage.getItem(PI_UPDATE_ACKNOWLEDGED_KEY);
    } catch {
      return null;
    }
  });
  const phase = update.status?.state.phase;
  const available = update.status?.available === true;
  const succeeded =
    phase === "succeeded" &&
    !available &&
    String(update.status?.state.startedAt) !== acknowledged;
  const failed = phase === "failed" || update.error !== null;

  if (!isOutdated && !available && !update.busy && !failed && !succeeded)
    return null;

  return {
    id: "app-version-outdated",
    severity: failed ? "danger" : succeeded ? "info" : "warning",
    icon: IconAlertTriangle,
    message: (
      <>
        {update.error ??
          (update.busy
            ? t("appVersion.updating")
            : failed
              ? (update.status?.state.message ?? t("appVersion.updateFailed"))
              : succeeded
                ? t("appVersion.updateSucceeded")
                : t("appVersion.outdatedBanner"))}
        {piHost &&
          isAdmin &&
          (available || failed) &&
          !succeeded &&
          !update.busy && (
            <span className="block">
              {t("appVersion.terminalUpdate")}{" "}
              <code className="select-all">
                cd ~/mault &amp;&amp; bash scripts/pi/update.sh
              </code>
            </span>
          )}
      </>
    ),
    actions: (
      <>
        {!update.busy && (
          <Button
            variant="outline"
            className={ALERT_BANNER_ACTION_CLASS}
            onClick={() => {
              if (phase === "succeeded") {
                try {
                  localStorage.setItem(
                    PI_UPDATE_ACKNOWLEDGED_KEY,
                    String(update.status?.state.startedAt),
                  );
                } catch {}
              }
              void hardReload();
            }}
          >
            {t("appVersion.refreshButton")}
          </Button>
        )}
      </>
    ),
  };
}
