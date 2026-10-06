import { Callout } from "@/components/callout";
import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNewBoardFlash } from "@/features/scanner/api/use-new-board-flash";
import { useSerial } from "@/features/scanner/api/use-serial";
import { Esp32FlashDialog } from "@/features/scanner/components/esp32-flash-dialog";
import { NewBoardFlashDialog } from "@/features/scanner/components/new-board-flash-dialog";
import { LATEST_FIRMWARE_VERSION } from "@/lib/constants/firmware";
import { FIRMWARE_RELEASES_URL } from "@/lib/constants/links";
import { isFirmwareVersionOutdated } from "@magic-vault/shared";
import { IconDownload, IconExternalLink } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function FirmwarePanel() {
  const { t } = useTranslation("calibration");
  const {
    isConnected,
    firmwareVersion,
    board,
    transport,
    isFlashing,
    connect,
  } = useSerial();
  const { isSupported: webSerialSupported } = useNewBoardFlash();
  const [connectedFlashOpen, setConnectedFlashOpen] = useState(false);
  const [newBoardFlashOpen, setNewBoardFlashOpen] = useState(false);

  const isEsp32OverUsb =
    (isConnected && board === "esp32" && transport === "serial") || isFlashing;
  const isEsp32OverBluetooth =
    isConnected &&
    board === "esp32" &&
    transport === "bluetooth" &&
    !isFlashing;
  const isUno = isConnected && board === "uno_r4" && !isFlashing;
  const isOutdated =
    isConnected &&
    isFirmwareVersionOutdated(firmwareVersion, LATEST_FIRMWARE_VERSION);

  const installedLabel = isConnected
    ? (firmwareVersion ?? t("firmware.unknownVersion"))
    : t("firmware.notConnected");

  const action = isEsp32OverUsb ? (
    <Button size="sm" onClick={() => setConnectedFlashOpen(true)}>
      <IconDownload />
      {t("firmware.flashConnected")}
    </Button>
  ) : isUno ? (
    <Button
      size="sm"
      variant="outline"
      render={
        <a href={FIRMWARE_RELEASES_URL} target="_blank" rel="noreferrer" />
      }
    >
      <IconExternalLink />
      {t("firmware.getRelease")}
    </Button>
  ) : !isConnected && webSerialSupported ? (
    <Button
      size="sm"
      variant="outline"
      onClick={() => setNewBoardFlashOpen(true)}
    >
      <IconDownload />
      {t("firmware.flashBoard")}
    </Button>
  ) : null;

  return (
    <SettingsSection
      heading={t("firmware.title")}
      description={t("firmware.description")}
      action={action}
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1 rounded-md border bg-muted px-3 py-2">
          <span className="text-2xs font-medium uppercase tracking-wide text-foreground/70">
            {t("firmware.installed")}
          </span>
          <span className="flex items-center gap-2 text-sm font-medium">
            {installedLabel}
            {isOutdated && (
              <Badge variant="outline">{t("firmware.outdated")}</Badge>
            )}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-md border bg-muted px-3 py-2">
          <span className="text-2xs font-medium uppercase tracking-wide text-foreground/70">
            {t("firmware.latest")}
          </span>
          <span className="text-sm font-medium">{LATEST_FIRMWARE_VERSION}</span>
        </div>
      </div>
      {isEsp32OverBluetooth && (
        <Callout variant="info">{t("firmware.bluetoothNote")}</Callout>
      )}
      {isUno && <Callout variant="info">{t("firmware.unoNote")}</Callout>}
      <Esp32FlashDialog
        open={connectedFlashOpen}
        onOpenChange={setConnectedFlashOpen}
      />
      <NewBoardFlashDialog
        open={newBoardFlashOpen}
        onOpenChange={setNewBoardFlashOpen}
        onConnect={() => void connect()}
      />
    </SettingsSection>
  );
}
