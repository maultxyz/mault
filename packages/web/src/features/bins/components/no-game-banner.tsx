import { AlertBanner } from "@/components/alert-banner";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function NoGameBanner() {
  const { t } = useTranslation("bins");
  const { hasCollection, hasGame } = useBinConfigs();

  if (!hasCollection || hasGame) return null;

  return (
    <AlertBanner
      alert={{
        id: "no-game",
        severity: "warning",
        icon: IconAlertTriangle,
        message: t("noGameBanner.message"),
      }}
    />
  );
}
