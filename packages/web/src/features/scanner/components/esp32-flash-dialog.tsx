import { useSerial } from "@/features/scanner/api/use-serial";
import { FirmwareFlashDialog } from "@/features/scanner/components/firmware-flash-dialog";
import { ESP32_FIRMWARE_URL } from "@/lib/constants/links";
import { useTranslation } from "react-i18next";

export function Esp32FlashDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("scanner");
  const { isFlashing, flashProgress, flashLog, flashEsp32 } = useSerial();

  return (
    <FirmwareFlashDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("serial.update.dialogTitle")}
      description={t("serial.update.dialogDescription")}
      startLabel={t("serial.update.startButton")}
      successMessage={t("serial.update.success")}
      isFlashing={isFlashing}
      flashProgress={flashProgress}
      flashLog={flashLog}
      onStart={() => flashEsp32(ESP32_FIRMWARE_URL)}
    />
  );
}
