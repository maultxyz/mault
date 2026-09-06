import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function NoGameBanner() {
  const { t } = useTranslation("bins");
  const { hasCollection, hasGame } = useBinConfigs();

  if (!hasCollection || hasGame) return null;

  return (
    <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-400/10 px-4 py-2 text-xs text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
      <IconAlertTriangle className="size-3.5 shrink-0 mt-0.5" />
      <span>{t("noGameBanner.message")}</span>
    </div>
  );
}
