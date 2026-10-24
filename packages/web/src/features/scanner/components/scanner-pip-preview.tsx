import { useDevice } from "@/features/calibration/api/use-device";
import { useCollections } from "@/features/collections/api/use-collections";
import { useCollectionCardsSummary } from "@/features/collections/api/use-collection-cards";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useDesktopPipDrag } from "@/features/scanner/api/use-desktop-pip-drag";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { StationStatusDot } from "@/features/scanner/components/station-status-dot";
import type { ScannerPipPreviewProps } from "@/lib/interfaces/scanner";
import { formatElapsed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { IconArrowBackUp, IconCamera } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export function ScannerPipPreview({
  variant,
  className,
  onOpen,
  action,
  controls,
}: ScannerPipPreviewProps) {
  const { t } = useTranslation("scanner");
  const { stream, cameraSource } = useCameraContext();
  const device = useDevice();
  const { elapsedMs, isTimerActive } = useScannedCards();
  const { activeCollection } = useCollections();
  const { totalCount } = useCollectionCardsSummary();
  const videoRef = useRef<HTMLVideoElement>(null);
  const isWindow = variant === "window";
  const dragHandlers = useDesktopPipDrag();

  const showsVideo = !!stream && cameraSource === "local";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showsVideo) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [showsVideo, stream]);

  const statusLabel = isTimerActive
    ? t("scannerPip.sorting")
    : t("scannerPip.paused");

  return (
    <div
      {...(isWindow ? dragHandlers : {})}
      className={cn(
        "group relative overflow-hidden bg-background",
        isWindow && "flex h-full touch-none flex-col select-none",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("scannerPip.returnToScanner")}
        className={cn(
          "block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          isWindow && "flex min-h-0 flex-1 flex-col",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-black",
            isWindow ? "min-h-0 flex-1" : "aspect-[3/4]",
          )}
        >
          <div
            className={cn(
              "absolute",
              isWindow
                ? "inset-y-0 left-1/2 aspect-[3/4] -translate-x-1/2"
                : "inset-0",
            )}
          >
            {showsVideo ? (
              <video
                ref={videoRef}
                muted
                playsInline
                className={cn(
                  "absolute top-1/2 left-1/2 w-[133.333%] h-3/4 max-w-none -translate-x-1/2 -translate-y-1/2 object-cover",
                  device?.flipCamera ? "-rotate-90" : "rotate-90",
                )}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/60">
                <IconCamera size={28} />
              </div>
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <IconArrowBackUp size={16} />
            {t("scannerPip.returnToScanner")}
          </div>
          <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            <StationStatusDot status={isTimerActive ? "sorting" : "paused"} />
            {statusLabel}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2">
          <span className="truncate text-sm font-medium text-foreground">
            {activeCollection?.name ?? t("scannerPip.noCollection")}
          </span>
          <span className="flex justify-between text-xs text-foreground/70">
            <span>{t("cardCount", { count: totalCount })}</span>
            <span className="tabular-nums">{formatElapsed(elapsedMs)}</span>
          </span>
        </div>
      </button>
      {controls}
      <button
        type="button"
        onClick={action.onClick}
        aria-label={action.label}
        title={action.label}
        className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {action.icon}
      </button>
    </div>
  );
}
