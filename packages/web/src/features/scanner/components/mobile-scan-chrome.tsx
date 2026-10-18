import { Button } from "@/components/ui/button";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { MobileCollectionSheet } from "@/features/scanner/components/mobile-collection-sheet";
import { MobilePresetSheet } from "@/features/scanner/components/mobile-preset-sheet";
import { MobileScanNotice } from "@/features/scanner/components/mobile-scan-notice";
import { MobileScanControlsSheet } from "@/features/scanner/components/mobile-scan-controls-sheet";
import { MobileScanOptionsSheet } from "@/features/scanner/components/mobile-scan-options-sheet";
import { MobileSessionScansSheet } from "@/features/scanner/components/mobile-session-scans-sheet";
import {
  MOBILE_SCAN_CHIP_CLASS,
  SESSION_TIMER_RUNNING_STATUSES,
} from "@/lib/constants/scanner";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import type { MobileScanChromeProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import {
  IconAdjustments,
  IconCamera,
  IconCards,
  IconChevronRight,
  IconDots,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function MobileScanChrome({ chrome }: MobileScanChromeProps) {
  const { t } = useTranslation("scanner");
  const { activeCollection } = useCollections();
  const { sessionScanCount } = useScannedCards();
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  const running = SESSION_TIMER_RUNNING_STATUSES.includes(chrome.status);
  const sorterDriven = chrome.isReady;
  const canShoot = chrome.isCameraActive && !chrome.isAtScanLimit;

  const phaseLabel = (() => {
    switch (chrome.status) {
      case "initializing":
      case "requesting-camera":
        return t("scannerOverlay.initializing");
      case "settling":
        return t("scannerOverlay.settling");
      case "searching":
        return t("scannerOverlay.identifyingCard");
      case "paused":
        return t("scannerOverlay.paused");
      case "duplicate":
        return t("scannerOverlay.duplicate");
      case "no-match":
        return t("scannerOverlay.noMatch");
      case "error":
        return t("mobileScan.phase.error");
      default:
        if (chrome.handScanActive) return t("mobileScan.phase.handScan");
        return sorterDriven
          ? t("mobileScan.phase.scanning")
          : t("mobileScan.phase.ready");
    }
  })();

  const notice = (() => {
    if (chrome.isAtScanLimit) {
      return (
        <MobileScanNotice
          tone="warning"
          title={t("scannerOverlay.dailyLimitReached")}
          action={
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              render={<Link to={SETTINGS_PATHS.billing} />}
            >
              {t("scannerOverlay.upgradeButton")}
            </Button>
          }
        />
      );
    }
    if (!chrome.isCameraActive) {
      return (
        <MobileScanNotice
          title={t("mobileScan.cameraOff")}
          description={chrome.errorMessage || t("mobileScan.cameraOffDescription")}
          action={
            <Button size="sm" className="rounded-full" onClick={chrome.onRetry}>
              {t("mobileScan.startCamera")}
            </Button>
          }
        />
      );
    }
    if (chrome.status === "error") {
      return (
        <MobileScanNotice
          tone="error"
          title={chrome.errorMessage || t("mobileScan.phase.error")}
          action={
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={chrome.onRetry}
            >
              {t("mobileScan.retry")}
            </Button>
          }
        />
      );
    }
    if (chrome.sensorBlockedModule !== null) {
      return (
        <MobileScanNotice
          tone="error"
          title={t("scannerOverlay.sensorBlocked", {
            module: chrome.sensorBlockedModule,
          })}
          action={
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={chrome.onResolveSensorBlocked}
            >
              {t("scannerOverlay.resolveSensorBlocked")}
            </Button>
          }
        />
      );
    }
    if (chrome.isReady && !chrome.hasCatchAll) {
      return (
        <MobileScanNotice tone="warning" title={t("scannerOverlay.noCatchAllBin")} />
      );
    }
    if (!chrome.isConnected && !chrome.handScan && sessionScanCount === 0) {
      return (
        <MobileScanNotice
          title={t("mobileScan.noSorterTitle")}
          description={t("mobileScan.noSorterDescription")}
          action={
            chrome.bluetoothSupported ? (
              <Button
                size="sm"
                className="rounded-full"
                onClick={chrome.onConnectBluetooth}
              >
                {t("mobileScan.connect")}
              </Button>
            ) : undefined
          }
        />
      );
    }
    return null;
  })();

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between">
        <div className="flex items-center gap-2 px-4 pt-3">
          <span className={MOBILE_SCAN_CHIP_CLASS}>
            {running && (
              <span className="size-2 shrink-0 rounded-full bg-success animate-pulse motion-reduce:animate-none" />
            )}
            <span className="truncate">{phaseLabel}</span>
          </span>
          <button
            type="button"
            onClick={() => setSessionOpen(true)}
            className={cn(MOBILE_SCAN_CHIP_CLASS, "shrink-0")}
          >
            <IconCards className="size-4 shrink-0" />
            {t("mobileScan.session.chip", { count: sessionScanCount })}
            <IconChevronRight className="size-4 shrink-0" />
          </button>
          <button
            type="button"
            aria-label={t("mobileScan.options")}
            onClick={() => setOptionsOpen(true)}
            className={cn(
              MOBILE_SCAN_CHIP_CLASS,
              "ml-auto size-9 shrink-0 justify-center px-0",
            )}
          >
            <IconDots className="size-5" />
          </button>
        </div>
        {chrome.handScanActive && chrome.lastRoutedBin && (
          <div className="flex justify-center px-4 pt-3">
            <div
              key={chrome.lastRoutedBin.at}
              className="flex flex-col items-center rounded-lg border border-primary bg-primary px-5 py-2 text-primary-foreground shadow-lg animate-in fade-in zoom-in-95 motion-reduce:animate-none"
            >
              <span className="text-xs font-medium">
                {t("scannerOverlay.handScanBinLabel")}
              </span>
              <span className="text-3xl font-bold tabular-nums">
                {t("scannerOverlay.handScanBin", {
                  number: chrome.lastRoutedBin.binNumber,
                })}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 px-4 pb-[calc(var(--mobile-nav-space,0px)+1rem)]">
          {notice}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              aria-label={t("mobileScan.controls.open")}
              onClick={() => setControlsOpen(true)}
              className={cn(MOBILE_SCAN_CHIP_CLASS, "size-11 justify-center px-0")}
            >
              <IconAdjustments className="size-5" />
            </button>
            <button
              type="button"
              disabled={!canShoot}
              aria-label={
                sorterDriven
                  ? running
                    ? t("mobileScan.pause")
                    : t("mobileScan.start")
                  : t("mobileScan.scanOnce")
              }
              onClick={
                sorterDriven
                  ? running
                    ? chrome.onPause
                    : chrome.onResume
                  : chrome.onScanOnce
              }
              className={cn(
                "pointer-events-auto flex size-12 items-center justify-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-50 motion-reduce:active:scale-100 [&_svg]:size-5",
                running ? "bg-destructive" : "bg-primary",
              )}
            >
              {sorterDriven ? (
                running ? (
                  <IconPlayerPauseFilled />
                ) : (
                  <IconPlayerPlayFilled />
                )
              ) : (
                <IconCamera />
              )}
            </button>
          </div>
        </div>
      </div>
      <MobileCollectionSheet
        open={collectionsOpen}
        onOpenChange={setCollectionsOpen}
      />
      <MobileScanOptionsSheet
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        chrome={chrome}
        onChooseCollection={() => {
          setOptionsOpen(false);
          setCollectionsOpen(true);
        }}
        onChoosePreset={() => {
          setOptionsOpen(false);
          setPresetsOpen(true);
        }}
      />
      <MobilePresetSheet open={presetsOpen} onOpenChange={setPresetsOpen} />
      <MobileScanControlsSheet
        open={controlsOpen}
        onOpenChange={setControlsOpen}
        chrome={chrome}
      />
      <MobileSessionScansSheet
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        collectionGuid={activeCollection?.guid}
        count={sessionScanCount}
      />
    </>
  );
}
