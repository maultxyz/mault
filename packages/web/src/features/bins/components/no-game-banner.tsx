import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function NoGameBanner() {
  const { t } = useTranslation("bins");
  const { hasCollection, hasGame } = useBinConfigs();

  if (!hasCollection || hasGame) return null;

  return (
    <div className="flex items-start gap-2 border-b border-warning-border bg-warning-muted px-4 py-2 text-xs text-warning-foreground">
      <IconAlertTriangle className="size-3.5 shrink-0 mt-0.5" />
      <span>{t("noGameBanner.message")}</span>
    </div>
  );
}
