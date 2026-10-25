import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWifiSorters } from "@/features/scanner/api/use-wifi-sorters";
import type { ScannerOverlayProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconCameraSpark,
  IconCards,
  IconDeviceMobile,
  IconDeviceUsb,
  IconHandStop,
  IconLoader2,
  IconQrcode,
  IconRefresh,
} from "@tabler/icons-react";
import { cva, type VariantProps } from "class-variance-authority";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { ConnectSorterMenuItems } from "@/features/scanner/components/connect-sorter-menu-items";

const statusPill = cva(
  "absolute bottom-1 left-1 right-1 z-30 rounded-lg backdrop-blur-3xl border text-xs px-2 py-1 flex flex-row gap-1.5 items-center text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background border-border",
        loading: "bg-background border-border",
        warning: "bg-warning-strong border-warning-strong text-white",
        error: "bg-destructive-strong border-destructive-strong text-white",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function StatusPill({
  children,
  variant,
  className,
}: { children: React.ReactNode; className?: string } & VariantProps<
  typeof statusPill
>) {
  return (
    <div className={cn(statusPill({ variant }), className)}>{children}</div>
  );
}

export function ScannerOverlay({
  status,
  errorMessage,
  isCameraActive,
  isConnected,
  isReady,
  sensorBlockedModule,
  onResolveSensorBlocked,
  firmwareVersion,
  hasCatchAll,
  autoFeed,
  cameraSource,
  phonePairingStatus,
  hasPhonePhoto,
  dailyLimitReached,
  onRetryError,
  onConnectCamera,
  onOpenPhonePairing,
  onConnectScanner,
  onConnectScannerBluetooth,
  onConnectScannerCloud,
  bluetoothSupported,
  handScanActive,
  lastRoutedBin,
  onEnableHandScan,
}: ScannerOverlayProps) {
  const { t } = useTranslation("scanner");
  const hasWifiSorters = useWifiSorters(false).length > 0;
  const isPhoneMode = cameraSource === "phone";

  if (dailyLimitReached) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-4">
        <div className="text-center text-sm text-foreground/70 max-w-56 flex flex-col items-center gap-2">
          <IconAlertTriangle className="mx-auto size-5 text-destructive" />
          <p>{t("scannerOverlay.dailyLimitReached")}</p>
          <Button size="sm" nativeButton={false}>
            <Link to={SETTINGS_PATHS.billing}>{t("scannerOverlay.upgradeButton")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isCameraActive) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-4">
        <div className="flex flex-col items-center gap-3 text-center max-w-56">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">
              {isPhoneMode
                ? t("scannerOverlay.waitingForPhoneTitle")
                : t("scannerOverlay.noCameraTitle")}
            </p>
            <p className="text-xs text-foreground/70">
              {isPhoneMode
                ? t("scannerOverlay.waitingForPhone")
                : t("scannerOverlay.connectCamera")}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            {isPhoneMode ? (
              <Button onClick={onOpenPhonePairing}>
                <IconQrcode />
                {t("scannerOverlay.showQrCode")}
              </Button>
            ) : (
              <>
                <Button onClick={onConnectCamera}>
                  <IconCameraSpark />
                  {t("scannerOverlay.connectCameraButton")}
                </Button>
                <Button variant="ghost" onClick={onOpenPhonePairing}>
                  <IconDeviceMobile />
                  {t("usePhoneAsCamera")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isPhoneMode && phonePairingStatus === "connected" && !hasPhonePhoto) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-4">
        <div className="text-center text-sm text-foreground/70">
          <IconDeviceMobile className="mx-auto mb-2 size-5" />
          <p>{t("scannerOverlay.phoneReadyNoPhoto")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {handScanActive && lastRoutedBin && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center">
          <div
            key={lastRoutedBin.at}
            className="flex flex-col items-center rounded-lg border border-primary bg-primary px-4 py-2 text-primary-foreground shadow-lg animate-in fade-in zoom-in-95 motion-reduce:animate-none"
          >
            <span className="text-xs font-medium">
              {t("scannerOverlay.handScanBinLabel")}
            </span>
            <span className="text-3xl font-bold tabular-nums">
              {t("scannerOverlay.handScanBin", {
                number: lastRoutedBin.binNumber,
              })}
            </span>
          </div>
        </div>
      )}
      {renderStatusPill()}
    </>
  );

  function renderStatusPill() {
    if (!isConnected && !handScanActive) {
      return (
        <StatusPill variant="warning">
          <IconDeviceUsb className="size-3.5 shrink-0" />
          <span className="flex-1">
            {t("scannerOverlay.scannerNotConnected")}
          </span>
          {bluetoothSupported || hasWifiSorters ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" />}>
                {t("connect")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ConnectSorterMenuItems
                  onConnectUsb={onConnectScanner}
                  onConnectBluetooth={onConnectScannerBluetooth}
                  onConnectCloud={onConnectScannerCloud}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={onConnectScanner}>
              {t("connect")}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onEnableHandScan}>
            {t("scannerOverlay.scanByHand")}
          </Button>
        </StatusPill>
      );
    }

    if (handScanActive) return renderScanStatus();

    if (sensorBlockedModule !== null) {
      return (
        <StatusPill variant="error">
          <IconAlertTriangle className="size-3.5 shrink-0" />
          <span className="flex-1">
            {t("scannerOverlay.sensorBlocked", { module: sensorBlockedModule })}
          </span>
          <Button size="sm" variant="secondary" onClick={onResolveSensorBlocked}>
            {t("scannerOverlay.resolveSensorBlocked")}
          </Button>
        </StatusPill>
      );
    }

    if (!isReady) {
      return (
        <StatusPill variant="loading">
          <IconLoader2 className="size-3.5 animate-spin shrink-0" />
          <span>{t("scannerOverlay.testingScanner")}</span>
        </StatusPill>
      );
    }

    if (!firmwareVersion) {
      return (
        <StatusPill variant="error">
          <IconAlertTriangle className="size-3.5 shrink-0" />
          <span>{t("scannerOverlay.firmwareVersionMissing")}</span>
        </StatusPill>
      );
    }

    if (!hasCatchAll) {
      return (
        <StatusPill variant="warning">
          <IconAlertTriangle className="size-3.5 shrink-0" />
          <span>{t("scannerOverlay.noCatchAllBin")}</span>
        </StatusPill>
      );
    }

    return renderScanStatus();
  }

  function renderScanStatus() {
    switch (status) {
      case "initializing":
        return (
          <StatusPill variant="loading">
            <IconLoader2 className="size-3.5 animate-spin shrink-0" />
            <span>{t("scannerOverlay.initializing")}</span>
          </StatusPill>
        );
      case "requesting-camera":
        return (
          <StatusPill variant="loading">
            <IconCameraSpark className="size-3.5 shrink-0" />
            <span>{t("requestingCameraAccess")}</span>
          </StatusPill>
        );
      case "error":
        return (
          <StatusPill variant="error">
            <span className="flex-1">{errorMessage}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={onRetryError}
              className="size-6 shrink-0"
            >
              <IconRefresh className="size-3" />
            </Button>
          </StatusPill>
        );
      case "settling":
        return (
          <StatusPill variant="loading">
            <IconLoader2 className="size-3.5 animate-spin shrink-0" />
            <span>{t("scannerOverlay.settling")}</span>
          </StatusPill>
        );
      case "searching":
        return (
          <StatusPill variant="loading">
            <IconLoader2 className="size-3.5 animate-spin shrink-0" />
            <span>{t("scannerOverlay.identifyingCard")}</span>
          </StatusPill>
        );
      case "paused":
        return <StatusPill>{t("scannerOverlay.paused")}</StatusPill>;
      case "duplicate":
        return (
          <StatusPill variant="warning">
            <IconAlertTriangle className="size-3.5 shrink-0" />
            <span>{t("scannerOverlay.duplicate")}</span>
          </StatusPill>
        );
      case "no-match":
        return (
          <StatusPill variant="warning">
            <IconAlertTriangle className="size-3.5 shrink-0" />
            <span>{t("scannerOverlay.noMatch")}</span>
          </StatusPill>
        );
      default:
        if (handScanActive) {
          return (
            <StatusPill>
              <IconCards className="size-3.5 shrink-0" />
              <span>{t("scannerOverlay.handScanPrompt")}</span>
            </StatusPill>
          );
        }
        if (!autoFeed) {
          return (
            <StatusPill>
              <IconHandStop className="size-3.5 shrink-0" />
              <span>{t("scannerOverlay.autoFeedOff")}</span>
            </StatusPill>
          );
        }
        return null;
    }
  }
}
