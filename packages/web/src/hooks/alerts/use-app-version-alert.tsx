import { Button } from "@/components/ui/button";
import { ALERT_BANNER_ACTION_CLASS } from "@/lib/constants/colors";
import { useAppVersionCheck } from "@/hooks/use-app-version-check";
import type { AppAlert } from "@/lib/interfaces/alerts";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function useAppVersionAlert(): AppAlert | null {
  const { t } = useTranslation("common");
  const isOutdated = useAppVersionCheck();

  if (!isOutdated) return null;

  return {
    id: "app-version-outdated",
    severity: "warning",
    icon: IconAlertTriangle,
    message: t("appVersion.outdatedBanner"),
    actions: (
      <Button
        size="xs"
        variant="outline"
        className={ALERT_BANNER_ACTION_CLASS}
        onClick={() => window.location.reload()}
      >
        {t("appVersion.refreshButton")}
      </Button>
    ),
  };
}
