import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewBoardFlashDialog } from "@/features/scanner/components/new-board-flash-dialog";
import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import {
  IconAdjustments,
  IconCameraSpark,
  IconDeviceMobile,
  IconDeviceUsb,
  IconDeviceUsbFilled,
  IconDownload,
  IconPlus,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ScannerMenuProps } from "@/lib/interfaces/scanner";

export function ScannerMenu({
  isCameraActive,
  isConnected,
  autoFeed,
  allowDuplicates,
  cameras,
  selectedCameraId,
  phonePairingStatus,
  scanningBlocked,
  onCameraConnect,
  onCameraDisconnect,
  onCameraSelect,
  onOpenPhonePairing,
  onScannerConnect,
  onScannerConnectBluetooth,
  bluetoothSupported,
  onScannerDisconnect,
  onScannerRetry,
  onCalibrate,
  onAutoFeedChange,
  onAllowDuplicatesChange,
  onConnectAnotherUsb,
  onConnectAnotherBluetooth,
  canConnectAnotherSorter,
  sorterLimitIsHardCap,
  onUpgrade,
}: ScannerMenuProps) {
  const { t } = useTranslation("scanner");
  const [flashDialogOpen, setFlashDialogOpen] = useState(false);
  const webSerialSupported =
    typeof navigator !== "undefined" && !!navigator.serial;


  return (
    <div className="absolute top-2 right-2 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon" variant="secondary" data-tour="scanner-menu" />
          }
        >
          <IconAdjustments size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <IconCameraSpark />
              {t("scannerMenu.camera")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
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
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={onCameraDisconnect}
                  >
                    {t("disconnect")}
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  disabled={scanningBlocked}
                  onClick={onCameraConnect}
                >
                  {t("connect")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenPhonePairing}>
                <IconDeviceMobile />
                {phonePairingStatus === "connected"
                  ? t("scannerMenu.phoneCameraConnected")
                  : t("usePhoneAsCamera")}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {isConnected ? <IconDeviceUsbFilled /> : <IconDeviceUsb />}
              {t("scannerMenu.scanner")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {isConnected ? (
                <>
                  <DropdownMenuCheckboxItem
                    checked={autoFeed}
                    onCheckedChange={onAutoFeedChange}
                  >
                    {t("scannerMenu.autoFeed")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={allowDuplicates}
                    onCheckedChange={onAllowDuplicatesChange}
                  >
                    {t("scannerMenu.allowDuplicates")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onCalibrate}>
                    {t("scannerMenu.calibrate")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onScannerRetry}>
                    {t("scannerMenu.retryConnection")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={onScannerDisconnect}
                  >
                    {t("disconnect")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {canConnectAnotherSorter ? (
                    <>
                      <DropdownMenuItem onClick={onConnectAnotherUsb}>
                        <IconPlus />
                        {t("scannerMenu.connectAnotherUsb")}
                      </DropdownMenuItem>
                      {bluetoothSupported && (
                        <DropdownMenuItem onClick={onConnectAnotherBluetooth}>
                          <IconPlus />
                          {t("scannerMenu.connectAnotherBluetooth")}
                        </DropdownMenuItem>
                      )}
                    </>
                  ) : sorterLimitIsHardCap ? (
                    <DropdownMenuItem disabled>
                      <IconPlus />
                      {t("stations.hardCapReached.title", {
                        max: MAX_CONNECTED_SORTERS,
                      })}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={onUpgrade}>
                      <IconPlus />
                      {t("scannerMenu.connectAnotherUpgrade")}
                    </DropdownMenuItem>
                  )}
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    disabled={scanningBlocked}
                    onClick={onScannerConnect}
                  >
                    {t("scannerMenu.connectUsb")}
                  </DropdownMenuItem>
                  {bluetoothSupported && (
                    <DropdownMenuItem
                      disabled={scanningBlocked}
                      onClick={onScannerConnectBluetooth}
                    >
                      {t("scannerMenu.connectBluetooth")}
                    </DropdownMenuItem>
                  )}
                  {webSerialSupported && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setFlashDialogOpen(true)}>
                        <IconDownload />
                        {t("scannerMenu.flashNewBoard")}
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <NewBoardFlashDialog
        open={flashDialogOpen}
        onOpenChange={setFlashDialogOpen}
        onConnect={onScannerConnect}
      />
    </div>
  );
}
