import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewBoardFlashDialog } from "@/features/scanner/components/new-board-flash-dialog";
import { WifiSorterMenuItems } from "@/features/scanner/components/wifi-sorter-menu-items";
import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import {
  IconArrowBarToDown,
  IconCameraSpark,
  IconDeviceMobile,
  IconDeviceUsb,
  IconDeviceUsbFilled,
  IconDownload,
  IconPlus,
  IconQrcode,
  IconRotate2,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CONTROL_CARDS_PATH } from "@/lib/constants/control-cards";
import type {
  ConnectionStatusPillProps,
  ScannerConnectionState,
  ScannerStatusBarProps,
} from "@/lib/interfaces/scanner";
import { SCANNER_CONNECTION_DOT_CLASS } from "@/lib/constants/scanner";
import { cn } from "@/lib/utils";
import { ConnectSorterMenuItems } from "@/features/scanner/components/connect-sorter-menu-items";

function ConnectionStatusPill({
  label,
  stateLabel,
  state,
  icon,
  ...buttonProps
}: ConnectionStatusPillProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className="rounded-full bg-background/85 backdrop-blur-sm"
      aria-label={`${label}: ${stateLabel}`}
      title={stateLabel}
      {...buttonProps}
    >
      {icon}
      {label}
      <span
        className={cn(
          "size-2 rounded-full",
          SCANNER_CONNECTION_DOT_CLASS[state],
        )}
      />
    </Button>
  );
}

export function ScannerStatusBar({
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
  onScannerConnectCloud,
  bluetoothSupported,
  onScannerDisconnect,
  onScannerRetry,
  onCalibrate,
  isReady,
  isClearingDevice,
  isResettingDevice,
  onClearDevice,
  onResetDevice,
  onAutoFeedChange,
  onAllowDuplicatesChange,
  onConnectAnotherUsb,
  onConnectAnotherBluetooth,
  onConnectAnotherCloud,
  canConnectAnotherSorter,
  sorterLimitIsHardCap,
  onUpgrade,
  handScan,
  onHandScanChange,
}: ScannerStatusBarProps) {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const [flashDialogOpen, setFlashDialogOpen] = useState(false);
  const webSerialSupported =
    typeof navigator !== "undefined" && !!navigator.serial;
  const cameraState: ScannerConnectionState =
    isCameraActive || phonePairingStatus === "connected"
      ? "connected"
      : phonePairingStatus === "waiting"
        ? "connecting"
        : "disconnected";
  const sorterState: ScannerConnectionState = !isConnected
    ? "disconnected"
    : isReady
      ? "connected"
      : "connecting";

  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-40 flex flex-wrap gap-1.5 *:pointer-events-auto">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <ConnectionStatusPill
              label={t("scannerMenu.camera")}
              stateLabel={t(`scannerMenu.connectionStates.${cameraState}`)}
              state={cameraState}
              icon={<IconCameraSpark />}
              data-tour="camera-status"
            />
          }
        />
        <DropdownMenuContent align="start" className="w-56">
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
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <ConnectionStatusPill
              label={t("scannerMenu.sorter")}
              stateLabel={t(`scannerMenu.connectionStates.${sorterState}`)}
              state={sorterState}
              icon={isConnected ? <IconDeviceUsbFilled /> : <IconDeviceUsb />}
              data-tour="sorter-status"
            />
          }
        />
        <DropdownMenuContent align="start" className="w-64">
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
              <DropdownMenuItem
                disabled={!isReady || isClearingDevice}
                onClick={onClearDevice}
              >
                <IconArrowBarToDown />
                {t("scannerMenu.clearDevice")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!isReady || isResettingDevice}
                onClick={onResetDevice}
              >
                <IconRotate2 />
                {t("scannerMenu.resetToNeutral")}
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
                  <WifiSorterMenuItems onSelect={onConnectAnotherCloud} />
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
              <ConnectSorterMenuItems
                disabled={scanningBlocked}
                onConnectUsb={onScannerConnect}
                onConnectBluetooth={onScannerConnectBluetooth}
                onConnectCloud={onScannerConnectCloud}
              />
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={handScan}
                onCheckedChange={onHandScanChange}
              >
                {t("scannerMenu.scanWithoutSorter")}
              </DropdownMenuCheckboxItem>
              {handScan && (
                <DropdownMenuCheckboxItem
                  checked={allowDuplicates}
                  onCheckedChange={onAllowDuplicatesChange}
                >
                  {t("scannerMenu.allowDuplicates")}
                </DropdownMenuCheckboxItem>
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate(CONTROL_CARDS_PATH)}>
            <IconQrcode />
            {t("controlCards.openPage")}
          </DropdownMenuItem>
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
