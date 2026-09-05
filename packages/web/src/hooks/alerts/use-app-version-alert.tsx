import { Button } from "@/components/ui/button";
import { useAppVersionCheck } from "@/hooks/use-app-version-check";
import type { AppAlert } from "@/lib/alerts";
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
        className="shrink-0 border-amber-500/40 bg-transparent text-amber-900 hover:bg-amber-500/20 dark:text-amber-200"
        onClick={() => window.location.reload()}
      >
        {t("appVersion.refreshButton")}
      </Button>
    ),
  };
}
