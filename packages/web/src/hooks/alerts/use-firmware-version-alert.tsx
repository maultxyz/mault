import { Button } from "@/components/ui/button";
import { useSerial } from "@/features/scanner/api/use-serial";
import { Esp32FlashDialog } from "@/features/scanner/components/esp32-flash-dialog";
import type { AppAlert } from "@/lib/alerts";
import { LATEST_FIRMWARE_VERSION } from "@/lib/firmware-version";
import { FIRMWARE_RELEASES_URL } from "@/lib/links";
import { isFirmwareVersionOutdated } from "@magic-vault/shared";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function useFirmwareVersionAlert(): {
  alert: AppAlert | null;
  portal: ReactNode;
} {
  const { t } = useTranslation("scanner");
  const { isConnected, firmwareVersion, board, isFlashing } = useSerial();
  const [flashDialogOpen, setFlashDialogOpen] = useState(false);

  const showAlert =
    isConnected &&
    isFirmwareVersionOutdated(firmwareVersion, LATEST_FIRMWARE_VERSION);
  const isEsp32 = board === "esp32" || isFlashing;

  const portal = (
    <Esp32FlashDialog
      open={flashDialogOpen}
      onOpenChange={setFlashDialogOpen}
    />
  );

  if (!showAlert) return { alert: null, portal };

  return {
    alert: {
      id: "firmware-version-outdated",
      severity: "warning",
      icon: IconAlertTriangle,
      message: t("serial.firmwareOutdatedBanner", {
        version: firmwareVersion,
        latest: LATEST_FIRMWARE_VERSION,
      }),
      actions: isEsp32 ? (
        <Button
          size="xs"
          variant="outline"
          className="shrink-0 border-amber-500/40 bg-transparent text-amber-900 hover:bg-amber-500/20 dark:text-amber-200"
          onClick={() => setFlashDialogOpen(true)}
        >
          {t("serial.update.browserButton")}
        </Button>
      ) : (
        <Button
          size="xs"
          variant="outline"
          className="shrink-0 border-amber-500/40 bg-transparent text-amber-900 hover:bg-amber-500/20 dark:text-amber-200"
          render={
            <a href={FIRMWARE_RELEASES_URL} target="_blank" rel="noreferrer" />
          }
        >
          {t("serial.update.manualButton")}
        </Button>
      ),
    },
    portal,
  };
}
