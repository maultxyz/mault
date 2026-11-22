import { CardImage } from "@/components/card-image";
import { CompactCount } from "@/components/compact-value";
import { MobileScanBuyRow } from "@/features/business/components/mobile-scan-buy-row";
import { Button } from "@/components/ui/button";
import { collectionCardsPageQueryOptions } from "@/features/collections/api/collection-cards";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { MobileScanRemovalSheet } from "@/features/scanner/components/mobile-scan-removal-sheet";
import { MobileCameraSheet } from "@/features/scanner/components/mobile-camera-sheet";
import { MobileCollectionSheet } from "@/features/scanner/components/mobile-collection-sheet";
import { MobilePresetSheet } from "@/features/scanner/components/mobile-preset-sheet";
import { MobileScanNotice } from "@/features/scanner/components/mobile-scan-notice";
import { MobileScanControlsSheet } from "@/features/scanner/components/mobile-scan-controls-sheet";
import { MobileScanOptionsSheet } from "@/features/scanner/components/mobile-scan-options-sheet";
import { MobileSessionScansSheet } from "@/features/scanner/components/mobile-session-scans-sheet";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import {
  MOBILE_SCAN_BOTTOM_SCRIM_CLASS,
  MOBILE_SCAN_CHIP_CLASS,
  MOBILE_SCAN_SESSION_THUMBNAIL_CLASS,
  MOBILE_SCAN_TEXT_ROW_CLASS,
  MOBILE_SCAN_TOP_SCRIM_CLASS,
  SESSION_TIMER_RUNNING_STATUSES,
} from "@/lib/constants/scanner";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import type { MobileScanChromeProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import {
  IconAdjustments,
  IconCamera,
  IconChevronRight,
  IconDots,
  IconHandStop,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
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
  const [camerasOpen, setCamerasOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [removalQueueOpen, setRemovalQueueOpen] = useState(false);
  const {
    queuedCount: removalQueuedCount,
    isRemoveModeActive,
  } = useScanRemoval();

  const { data: latestCardsPage } = useQuery({
    ...collectionCardsPageQueryOptions(activeCollection?.guid, ALL_CARDS_QUERY, 0),
    enabled: !!activeCollection && sessionScanCount > 0,
  });
  const lastScannedCardImage = latestCardsPage?.items[0]?.card.image?.small;

  const running = SESSION_TIMER_RUNNING_STATUSES.includes(chrome.status);
  const sorterDriven = chrome.isReady || chrome.handScanActive;
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
  const scanModeLabel = chrome.isReady
    ? t("mobileScan.statusModes.sorter")
    : isRemoveModeActive
      ? t("mobileScan.statusModes.removing")
      : chrome.handScanActive
        ? t("mobileScan.statusModes.handScan")
        : t("mobileScan.statusModes.scanOnce");
  const statusText = `${scanModeLabel} · ${phaseLabel}`;
  const phaseDotClassName =
    chrome.status === "error"
      ? "bg-destructive"
      : running
        ? "bg-success"
        : chrome.status === "paused" ||
            chrome.status === "initializing" ||
            chrome.status === "requesting-camera"
          ? "bg-warning"
          : null;

  const notice = (() => {
    if (chrome.isEmergencyStopped) {
      return (
        <MobileScanNotice
          tone="error"
          title={t("emergencyStop.stoppedTitle")}
          description={t("emergencyStop.stoppedDescription")}
          action={
            <Button
              onClick={chrome.onResetAfterEmergencyStop}
              disabled={chrome.isResettingSorter}
            >
              {t("emergencyStop.reset")}
            </Button>
          }
        />
      );
    }
    if (chrome.isAtScanLimit) {
      return (
        <MobileScanNotice
          tone="warning"
          title={t("scannerOverlay.dailyLimitReached")}
          action={
            <Button
              variant="secondary"
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
          description={
            chrome.errorMessage || t("mobileScan.cameraOffDescription")
          }
          action={
            <Button onClick={chrome.onRetry}>
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
              variant="secondary"
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
              variant="secondary"
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
        <MobileScanNotice
          tone="warning"
          title={t("scannerOverlay.noCatchAllBin")}
        />
      );
    }
    return null;
  })();

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between">
        <div className={cn("flex flex-col gap-3 px-4 pt-3 pb-6", MOBILE_SCAN_TOP_SCRIM_CLASS)}>
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <button
              type="button"
              disabled={running}
              aria-label={
                activeCollection
                  ? t("mobileScan.scanningInto", { name: activeCollection.name })
                  : t("mobileScan.chooseCollection")
              }
              onClick={() => setCollectionsOpen(true)}
              className={cn(MOBILE_SCAN_TEXT_ROW_CLASS, "font-heading text-lg font-semibold")}
            >
              <span className="truncate">
                {activeCollection?.name ?? t("mobileScan.chooseCollection")}
              </span>
              {!running && <IconChevronRight aria-hidden className="size-4" />}
            </button>
            {isRemoveModeActive && (
              <button
                type="button"
                onClick={() => setRemovalQueueOpen(true)}
                className={cn(MOBILE_SCAN_TEXT_ROW_CLASS, "text-xs font-medium")}
              >
                <IconTrash aria-hidden className="size-3.5" />
                <span className="truncate">
                  {t("scanRemoval.queuedCount", { count: removalQueuedCount })}
                </span>
                <IconChevronRight aria-hidden className="size-3" />
              </button>
            )}
            {activeCollection && (
              <MobileScanBuyRow
                collectionGuid={activeCollection.guid}
                isRunning={running}
                isRemoveModeActive={isRemoveModeActive}
              />
            )}
          </div>
          <button
            type="button"
            aria-label={t("mobileScan.options")}
            onClick={() => setOptionsOpen(true)}
            className={cn(
              MOBILE_SCAN_CHIP_CLASS,
              "size-9 shrink-0 justify-center px-0",
            )}
          >
            <IconDots className="size-5" />
          </button>
        </div>
        <div
          role="status"
          aria-live="polite"
          className="flex justify-center"
        >
          {chrome.handScanActive && chrome.lastRoutedBin && (
            <div
              key={chrome.lastRoutedBin.at}
              className="flex flex-col items-center rounded-lg border border-primary bg-primary px-5 py-2 text-primary-foreground shadow-popover animate-in fade-in zoom-in-95 motion-reduce:animate-none"
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
          )}
        </div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-3 px-4 pt-6 pb-[calc(var(--mobile-nav-space,0px)+1rem)]",
            MOBILE_SCAN_BOTTOM_SCRIM_CLASS,
          )}
        >
          <div role="status" aria-live="polite">
            {notice}
          </div>
          {chrome.isConnected && !chrome.isEmergencyStopped && (
            <div className="flex">
              <Button
                variant="destructive"
                className="pointer-events-auto"
                onClick={chrome.onEmergencyStop}
              >
                <IconHandStop />
                {t("emergencyStop.stop")}
              </Button>
            </div>
          )}
          <div className="flex justify-center">
            <span
              role="status"
              aria-live="polite"
              className={cn(MOBILE_SCAN_TEXT_ROW_CLASS, "pointer-events-none text-xs font-medium")}
            >
              {phaseDotClassName && (
                <span
                  aria-hidden
                  className={cn("size-2 shrink-0 rounded-full", phaseDotClassName)}
                />
              )}
              <span className="truncate">{statusText}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center justify-start">
              {sessionScanCount > 0 && (
                <button
                  type="button"
                  aria-label={t("mobileScan.session.chip", { count: sessionScanCount })}
                  onClick={() => setSessionOpen(true)}
                  className={MOBILE_SCAN_SESSION_THUMBNAIL_CLASS}
                >
                  {lastScannedCardImage && (
                    <CardImage
                      src={lastScannedCardImage}
                      alt=""
                      className="absolute inset-0"
                    />
                  )}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-2xs font-semibold text-white"
                  >
                    <CompactCount value={sessionScanCount} />
                  </span>
                </button>
              )}
            </div>
            <button
              type="button"
              disabled={
                chrome.isEmergencyStopped ||
                (sorterDriven && running ? false : !canShoot)
              }
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
                "pointer-events-auto flex size-12 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-50 motion-reduce:active:scale-100 [&_svg]:size-5",
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
            <div className="flex flex-1 items-center justify-end">
              <button
                type="button"
                aria-label={t("mobileScan.controls.open")}
                onClick={() => setControlsOpen(true)}
                className={cn(
                  MOBILE_SCAN_CHIP_CLASS,
                  "size-10 justify-center px-0",
                )}
              >
                <IconAdjustments className="size-5" />
              </button>
            </div>
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
        onChooseCamera={() => {
          setOptionsOpen(false);
          setCamerasOpen(true);
        }}
      />
      <MobilePresetSheet open={presetsOpen} onOpenChange={setPresetsOpen} />
      <MobileCameraSheet
        open={camerasOpen}
        onOpenChange={setCamerasOpen}
        chrome={chrome}
      />
      <MobileScanControlsSheet
        open={controlsOpen}
        onOpenChange={setControlsOpen}
        chrome={chrome}
      />
      <MobileScanRemovalSheet
        open={removalQueueOpen}
        onOpenChange={setRemovalQueueOpen}
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
