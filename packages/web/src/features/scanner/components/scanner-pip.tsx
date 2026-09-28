import { useCollections } from "@/features/collections/api/use-collections";
import { useCollectionCardsSummary } from "@/features/collections/api/use-collection-cards";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { SCANNER_PIP_MINIMIZED_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { formatElapsed } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  IconArrowBackUp,
  IconCamera,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function readMinimized() {
  try {
    return localStorage.getItem(SCANNER_PIP_MINIMIZED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function StatusDot({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        isActive ? "bg-green-500 animate-pulse" : "bg-amber-400",
      )}
    />
  );
}

export function ScannerPip() {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const { station } = useStation();
  const { panelLayout, panelsDocked, connectedStationIds } = useStations();
  const { stream, cameraSource } = useCameraContext();
  const { elapsedMs, isTimerActive } = useScannedCards();
  const { activeCollection } = useCollections();
  const { totalCount } = useCollectionCardsSummary();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [minimized, setMinimizedState] = useState(readMinimized);

  const isVisible =
    !!panelLayout && !panelsDocked && connectedStationIds.has(station.id);
  const showsVideo =
    isVisible && !minimized && !!stream && cameraSource === "local";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showsVideo) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [showsVideo, stream]);

  const setMinimized = (next: boolean) => {
    setMinimizedState(next);
    try {
      localStorage.setItem(SCANNER_PIP_MINIMIZED_STORAGE_KEY, String(next));
    } catch {}
  };

  if (!isVisible) return null;

  const statusLabel = isTimerActive
    ? t("scannerPip.sorting")
    : t("scannerPip.paused");

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        aria-label={t("scannerPip.expand")}
        title={t("scannerPip.expand")}
        className="fixed bottom-8 right-0 z-50 flex items-center gap-2 rounded-l-lg border border-r-0 bg-background py-2 pr-2.5 pl-1.5 text-sm font-medium text-foreground shadow-xl transition-[padding] hover:pl-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconChevronLeft size={16} className="text-foreground/70" />
        <StatusDot isActive={isTimerActive} />
        <span className="sr-only">{statusLabel}</span>
        <span className="tabular-nums">{totalCount}</span>
      </button>
    );
  }

  return (
    <div className="group fixed bottom-8 right-4 z-50 w-48 overflow-hidden rounded-lg border bg-background shadow-xl">
      <button
        type="button"
        onClick={() => navigate("/app")}
        aria-label={t("scannerPip.returnToScanner")}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-black">
          {showsVideo ? (
            <video
              ref={videoRef}
              muted
              playsInline
              className="absolute top-1/2 left-1/2 w-[133.333%] h-3/4 max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/60">
              <IconCamera size={28} />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <IconArrowBackUp size={16} />
            {t("scannerPip.returnToScanner")}
          </div>
          <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            <StatusDot isActive={isTimerActive} />
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
      <button
        type="button"
        onClick={() => setMinimized(true)}
        aria-label={t("scannerPip.minimize")}
        title={t("scannerPip.minimize")}
        className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconChevronRight size={16} />
      </button>
    </div>
  );
}
