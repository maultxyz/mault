import { Badge } from "@/components/ui/badge";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import type { CameraMenuItemsProps } from "@/lib/interfaces/scanner";
import {
  IconDeviceMobile,
  IconRotateClockwise2,
  IconScan,
} from "@tabler/icons-react";
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
  isFeederSelected,
  onSetUpFeederCard,
  onOpenPhonePairing,
}: CameraMenuItemsProps) {
  const { t } = useTranslation("scanner");
  const { camerasInUseElsewhere } = useCameraContext();
  const isWebcamSelected = cameras.some(
    (camera) => camera.deviceId === selectedCameraId,
  );
  const listsWebcams =
    camerasInUseElsewhere.length > 0 ||
    (cameras.length > 0 &&
      (cameras.length > 1 || !isCameraActive || !isWebcamSelected));
  const webcamLabel = (camera: MediaDeviceInfo, index: number) =>
    camera.label || t("scannerMenu.cameraFallbackLabel", { index: index + 1 });

  return (
    <>
      {listsWebcams && (
        <>
          {cameras.map((cam, i) => (
            <DropdownMenuCheckboxItem
              key={cam.deviceId}
              disabled={scanningBlocked}
              checked={cam.deviceId === selectedCameraId}
              onCheckedChange={() => onCameraSelect(cam.deviceId)}
            >
              {webcamLabel(cam, i)}
            </DropdownMenuCheckboxItem>
          ))}
          {camerasInUseElsewhere.map((cam, i) => (
            <DropdownMenuCheckboxItem key={cam.deviceId} disabled checked={false}>
              {webcamLabel(cam, cameras.length + i)}
              <Badge variant="outline">{t("scannerMenu.cameraInUseElsewhere")}</Badge>
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
        </>
      )}
      {isCameraActive ? (
        <DropdownMenuItem variant="destructive" onClick={onCameraDisconnect}>
          {t("disconnect")}
        </DropdownMenuItem>
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
                <Badge variant="outline">{option.scanner.driver.toUpperCase()}</Badge>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
          {isFlatbedSelected && (
            <DropdownMenuItem onClick={onCalibrateFlatbed}>
              <IconScan />
              {t("scannerMenu.setFlatbedCardPosition")}
            </DropdownMenuItem>
          )}
          {isFeederSelected && (
            <DropdownMenuItem onClick={onSetUpFeederCard}>
              <IconRotateClockwise2 />
              {t("scannerMenu.setUpFeederCard")}
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
