import { Badge } from "@/components/ui/badge";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { CameraMenuItemsProps } from "@/lib/interfaces/scanner";
import { IconDeviceMobile, IconScan } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CameraMenuItems({
  isCameraActive,
  cameras,
  documentScannerOptions,
  isFlatbedSelected,
  selectedCameraId,
  phonePairingStatus,
  scanningBlocked,
  onCameraConnect,
  onCameraDisconnect,
  onCameraSelect,
  onCalibrateFlatbed,
  onOpenPhonePairing,
}: CameraMenuItemsProps) {
  const { t } = useTranslation("scanner");

  return (
    <>
      {isCameraActive ? (
        <>
          {cameras.length > 1 && (
            <>
              {cameras.map((cam, i) => (
                <DropdownMenuCheckboxItem
                  key={cam.deviceId}
                  checked={cam.deviceId === selectedCameraId}
                  onCheckedChange={() => onCameraSelect(cam.deviceId)}
                >
                  {cam.label ||
                    t("scannerMenu.cameraFallbackLabel", {
                      index: i + 1,
                    })}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem variant="destructive" onClick={onCameraDisconnect}>
            {t("disconnect")}
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem disabled={scanningBlocked} onClick={onCameraConnect}>
          {t("connect")}
        </DropdownMenuItem>
      )}
      {documentScannerOptions.length > 0 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("scannerMenu.documentScanners")}</DropdownMenuLabel>
            {documentScannerOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.cameraId}
                disabled={scanningBlocked}
                checked={option.cameraId === selectedCameraId}
                onCheckedChange={() => onCameraSelect(option.cameraId)}
              >
                {option.scanner.name}
                <Badge variant="secondary">
                  {t(`scannerMenu.documentScannerMode.${option.mode}`)}
                </Badge>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
          {isFlatbedSelected && (
            <DropdownMenuItem onClick={onCalibrateFlatbed}>
              <IconScan />
              {t("scannerMenu.setFlatbedCardPosition")}
            </DropdownMenuItem>
          )}
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onOpenPhonePairing}>
        <IconDeviceMobile />
        {phonePairingStatus === "connected"
          ? t("scannerMenu.phoneCameraConnected")
          : t("usePhoneAsCamera")}
      </DropdownMenuItem>
    </>
  );
}
