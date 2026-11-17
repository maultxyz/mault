import { useDevice } from "@/features/calibration/api/use-device";
import { useCollections } from "@/features/collections/api/use-collections";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useCollectionLatestCard } from "@/features/scanner/api/use-collection-latest-card";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStationAttentionLabel } from "@/features/scanner/api/use-station-attention-label";
import { useStationName } from "@/features/scanner/api/use-station-name";
import { stationCanResume } from "@/features/scanner/lib/station-attention";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { useSorterSelection } from "@/features/scanner/api/use-sorter-selection";
import { RenameDeviceButton } from "@/features/scanner/components/rename-device-button";
import { StationOverviewCard } from "@/features/scanner/components/station-overview-card";
import { Button } from "@/components/ui/button";
import { SCANNER_PATH, STATION_ATTENTION_FIXES } from "@/lib/constants/scanner";
import type { StationStatus } from "@/lib/interfaces/stations";
import { cn } from "@/lib/utils";
import {
  IconArrowRight,
  IconBox,
  IconCamera,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function StationOverviewTile() {
  const { t } = useTranslation("scanner");
  const { station, index } = useStation();
  const { setActiveStation } = useStations();
  const navigate = useNavigate();
  const name = useStationName(station, index);
  const device = useDevice();
  const { stream, cameraSource } = useCameraContext();
  const {
    isTimerActive,
    pause,
    resume,
    attention,
    reopenAttention,
    sessionScanCount,
  } = useScannedCards();
  const { isReady } = useSerial();
  const attentionLabel = useStationAttentionLabel();
  const attentionFix = attention ? STATION_ATTENTION_FIXES[attention.kind] : null;
  const status: StationStatus = attention
    ? "attention"
    : isTimerActive
      ? "sorting"
      : "paused";
  const canResume = stationCanResume(isReady, isTimerActive, attention);
  const openStation = () => {
    setActiveStation(station.id);
    navigate(SCANNER_PATH);
  };
  const { selectedKeys, toggleSelected } = useSorterSelection();
  const selectionKey = station.deviceGuid ?? station.id;
  const pauseLabel = t("stations.overview.pause", { name });
  const { activeCollection } = useCollections();
  const { latestCard, totalCount } = useCollectionLatestCard(
    activeCollection?.guid,
  );
  const videoRef = useRef<HTMLVideoElement>(null);
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

  return (
    <StationOverviewCard
      name={name}
      status={status}
      latestCard={latestCard}
      collectionName={activeCollection?.name}
      totalCount={totalCount}
      sessionScanCount={sessionScanCount}
      attentionLabel={attention ? attentionLabel(attention) : undefined}
      selected={selectedKeys.has(selectionKey)}
      onToggleSelect={() => toggleSelected(selectionKey)}
      action={
        <>
          {attentionFix === "emptyBin" && (
            <Button variant="outline" onClick={reopenAttention}>
              <IconBox />
              {t("stations.attention.fixes.emptyBin")}
            </Button>
          )}
          {attentionFix === "openSorter" && (
            <Button variant="outline" onClick={openStation}>
              <IconArrowRight />
              {t("stations.attention.fixes.openSorter")}
            </Button>
          )}
          {canResume && (
            <Button variant="outline" onClick={resume}>
              <IconPlayerPlay />
              {attention || sessionScanCount > 0
                ? t("stations.attention.fixes.resume")
                : t("stations.overview.start")}
            </Button>
          )}
          {isTimerActive && (
            <Button
              size="icon"
              variant="outline"
              aria-label={pauseLabel}
              title={pauseLabel}
              onClick={pause}
            >
              <IconPlayerPause />
            </Button>
          )}
          {device && <RenameDeviceButton device={device} />}
        </>
      }
      openLabel={t("stations.overview.openStation", { name })}
      onOpen={openStation}
      camera={
        showsVideo ? (
          <video
            ref={videoRef}
            aria-hidden
            autoPlay
            muted
            playsInline
            className={cn(
              "absolute top-1/2 left-1/2 w-[133.333%] h-3/4 max-w-none -translate-x-1/2 -translate-y-1/2 object-cover",
              device?.flipCamera ? "-rotate-90" : "rotate-90",
            )}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/70">
            <IconCamera className="size-5" />
            <span className="text-2xs">{t("stations.overview.noCamera")}</span>
          </div>
        )
      }
    />
  );
}
