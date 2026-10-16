import { useDevice } from "@/features/calibration/api/use-device";
import { useCollections } from "@/features/collections/api/use-collections";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useCollectionLatestCard } from "@/features/scanner/api/use-collection-latest-card";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useStationName } from "@/features/scanner/api/use-station-name";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { useSorterSelection } from "@/features/scanner/api/use-sorter-selection";
import { RenameDeviceButton } from "@/features/scanner/components/rename-device-button";
import { StationOverviewCard } from "@/features/scanner/components/station-overview-card";
import { Button } from "@/components/ui/button";
import { IconCamera, IconPlayerPause } from "@tabler/icons-react";
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
  const { isTimerActive, pause } = useScannedCards();
  const { selectedKeys, toggleSelected, registerSorterControl } =
    useSorterSelection();
  const selectionKey = station.deviceGuid ?? station.id;
  const pauseLabel = t("stations.overview.pause", { name });
  const { activeCollection } = useCollections();
  const { latestCard, totalCount } = useCollectionLatestCard(
    activeCollection?.guid,
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const showsVideo = !!stream && cameraSource === "local";

  useEffect(
    () =>
      registerSorterControl(selectionKey, { isRunning: isTimerActive, pause }),
    [registerSorterControl, selectionKey, isTimerActive, pause],
  );

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
      status={isTimerActive ? "sorting" : "paused"}
      latestCard={latestCard}
      collectionName={activeCollection?.name}
      totalCount={totalCount}
      selected={selectedKeys.has(selectionKey)}
      onToggleSelect={() => toggleSelected(selectionKey)}
      action={
        <>
          {isTimerActive && (
            <Button
              size="icon-sm"
              variant="ghost"
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
      onOpen={() => {
        setActiveStation(station.id);
        navigate("/app");
      }}
      camera={
        showsVideo ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute top-1/2 left-1/2 w-[133.333%] h-3/4 max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 object-cover"
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
