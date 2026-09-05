import { useSerial } from "@/features/scanner/api/use-serial";
import type { AppAlert } from "@/lib/alerts";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function useFirmwareMissingAlert(): AppAlert | null {
  const { t } = useTranslation("scanner");
  const { isConnected, isReady, firmwareVersion } = useSerial();

  if (!isConnected || !isReady || firmwareVersion) return null;

  return {
    id: "firmware-version-missing",
    severity: "danger",
    icon: IconAlertTriangle,
    message: t("serial.firmwareVersionMissingBanner"),
  };
}
