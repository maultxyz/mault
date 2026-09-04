import { Button } from "@/components/ui/button";
import type { ScannerOverlayProps } from "@/features/scanner/types";
import { cn } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconCameraSpark,
  IconDeviceMobile,
  IconDeviceUsb,
  IconHandStop,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";
import { cva, type VariantProps } from "class-variance-authority";
import { useTranslation } from "react-i18next";

const statusPill = cva(
  "absolute bottom-1 left-1 right-1 z-30 rounded-lg backdrop-blur-3xl border text-xs px-2 py-1 flex flex-row gap-1.5 items-center text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background border-border",
        loading: "bg-background border-border",
        warning: "bg-amber-500 border-amber-600 text-white",
        error: "bg-red-500 border-red-600 text-white",
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
  firmwareVersion,
  hasCatchAll,
  autoFeed,
  cameraSource,
  phonePairingStatus,
  hasPhonePhoto,
  apiHealthCheck,
  dailyLimitReached,
  onRetryError,
  onConnectScanner,
}: ScannerOverlayProps) {
  const { t } = useTranslation("scanner");
  const isPhoneMode = cameraSource === "phone";

  if (apiHealthCheck?.status === "error") {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-4">
        <div className="text-center text-xs text-muted-foreground max-w-56">
          <IconAlertTriangle className="mx-auto mb-2 size-5 text-destructive" />
          <p>{t("scannerOverlay.apiDown", { api: apiHealthCheck.name })}</p>
        </div>
      </div>
    );
  }

  if (dailyLimitReached) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-4">
        <div className="text-center text-xs text-muted-foreground max-w-56">
          <IconAlertTriangle className="mx-auto mb-2 size-5 text-destructive" />
          <p>{t("scannerOverlay.dailyLimitReached")}</p>
        </div>
      </div>
    );
  }

  if (!isCameraActive) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-4">
        <div className="text-center text-xs text-muted-foreground">
          {isPhoneMode ? (
            <IconDeviceMobile className="mx-auto mb-2 size-5" />
          ) : (
            <IconCameraSpark className="mx-auto mb-2 size-5" />
          )}
          <p>
            {isPhoneMode
              ? t("scannerOverlay.waitingForPhone")
              : t("scannerOverlay.connectCamera")}
          </p>
        </div>
      </div>
    );
  }

  if (isPhoneMode && phonePairingStatus === "connected" && !hasPhonePhoto) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-4">
        <div className="text-center text-xs text-muted-foreground">
          <IconDeviceMobile className="mx-auto mb-2 size-5" />
          <p>{t("scannerOverlay.phoneReadyNoPhoto")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="absolute top-1 left-1 right-1 z-30 flex justify-center pointer-events-none">
        <span className="rounded-full border border-border bg-background/70 backdrop-blur-3xl px-2 py-0.5 text-[11px] text-muted-foreground">
          {t("scannerOverlay.faceUpHint")}
        </span>
      </div>
      {renderStatusPill()}
    </>
  );

  function renderStatusPill() {
    if (!isConnected) {
      return (
        <StatusPill variant="warning">
          <IconDeviceUsb className="size-3.5 shrink-0" />
          <span className="flex-1">
            {t("scannerOverlay.scannerNotConnected")}
          </span>
          <Button size="sm" onClick={onConnectScanner}>
            {t("scannerOverlay.connectScannerButton")}
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
            <span>{t("scannerOverlay.requestingCameraAccess")}</span>
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
