import { useCollections } from "@/features/collections/api/use-collections";
import {
  usePhoneCameraCapture,
} from "@/features/scanner/api/use-phone-camera-capture";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import {
  applyFocus,
  loadSavedFocus,
  manualFocusRange,
  saveFocus,
} from "@/features/scanner/lib/camera-focus";
import {
  acquireFreeStream,
  camerasHeldByOtherStations,
  stopMediaStream,
} from "@/features/scanner/lib/camera-stream";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type {
  CameraContextValue,
  CameraRange,
  CameraSource,
  CameraStatus,
} from "@/lib/interfaces/scanner";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

const CameraContext = createContext<CameraContextValue | null>(null);

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("scanner");
  const isMobile = useIsMobile();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [focusRange, setFocusRange] = useState<CameraRange | null>(null);
  const [focusDistance, setFocusDistanceState] = useState<number | null>(
    null,
  );
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [cameraSource, setCameraSource] = useState<CameraSource>("local");
  const streamRef = useRef<MediaStream | null>(null);
  const { activeCollection } = useCollections();
  const { station, isLive } = useStation();
  const stationsCtx = useStations();
  const stationsRef = useRef(stationsCtx);
  stationsRef.current = stationsCtx;
  const stationId = station.id;
  const stationCameraIdRef = useRef(station.cameraId);
  stationCameraIdRef.current = station.cameraId;

  const otherStationCameraIds = useCallback(() => {
    const { stations, isStationLive } = stationsRef.current;
    return camerasHeldByOtherStations(stations, isStationLive, stationId);
  }, [stationId]);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      setStatus("requesting");
      setErrorMessage("");
      try {
        const mediaStream = await acquireFreeStream(
          deviceId,
          otherStationCameraIds(),
          isMobile,
        );
        if (!mediaStream) {
          setErrorMessage(t("camera.allInUse"));
          setStatus("error");
          return;
        }
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setStatus("ready");

        const track = mediaStream.getVideoTracks()[0];
        if (track) {
          const activeDeviceId = track.getSettings().deviceId ?? null;
          setSelectedCameraId(activeDeviceId);
          stationsRef.current.setStationCamera(stationId, activeDeviceId);

          const range = manualFocusRange(track);
          const savedFocus = range ? loadSavedFocus(activeDeviceId) : null;
          setFocusRange(range);
          setFocusDistanceState(savedFocus);
          if (savedFocus !== null) {
            await applyFocus(track, savedFocus).catch(() => {});
          }
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter((d) => d.kind === "videoinput"));
      } catch (err) {
        const msg =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? t("camera.permissionDenied")
            : t("cameraAccessError");
        setErrorMessage(msg);
        setStatus("error");
      }
    },
    [t, stationId, otherStationCameraIds, isMobile],
  );

  const setFocusDistance = useCallback((value: number | null) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    void applyFocus(track, value).catch(() => {});
    saveFocus(track.getSettings().deviceId ?? null, value);
    setFocusDistanceState(value);
  }, []);

  const {
    status: phonePairingStatus,
    start: startPhonePairingInternal,
    stop: stopPhonePairingInternal,
    requestCapture: requestPhoneCapture,
    sendScanRegion: sendPhoneScanRegion,
  } = usePhoneCameraCapture(activeCollection?.guid);

  const phonePairingUrl = activeCollection
    ? `${window.location.origin}/app/monitor/${activeCollection.guid}/camera`
    : null;

  const releaseLocalStream = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraSource === "phone") {
      stopPhonePairingInternal();
    }
    releaseLocalStream();
    setCameraSource("local");
    setStatus("idle");
    setErrorMessage("");
  }, [cameraSource, stopPhonePairingInternal, releaseLocalStream]);

  const retryCamera = useCallback(async () => {
    stopCamera();
    await startCamera(selectedCameraId ?? undefined);
  }, [startCamera, stopCamera, selectedCameraId]);

  const startPhonePairing = useCallback(() => {
    releaseLocalStream();
    setErrorMessage("");
    setCameraSource("phone");
    startPhonePairingInternal();
  }, [startPhonePairingInternal, releaseLocalStream]);

  const stopPhonePairing = useCallback(() => {
    stopPhonePairingInternal();
    setCameraSource((prev) => (prev === "phone" ? "local" : prev));
  }, [stopPhonePairingInternal]);

  const selectCamera = useCallback(
    async (deviceId: string) => {
      if (otherStationCameraIds().has(deviceId)) return;
      stopCamera();
      await startCamera(deviceId);
    },
    [startCamera, stopCamera, otherStationCameraIds],
  );

  useEffect(() => {
    if (isMobile || !isLive) return;

    void startCamera(stationCameraIdRef.current ?? undefined);

    return () => {
      releaseLocalStream();
      setStatus("idle");
    };
  }, [startCamera, isMobile, isLive, releaseLocalStream]);

  useEffect(() => {
    if (
      status === "ready" &&
      cameraSource === "local" &&
      station.cameraId &&
      selectedCameraId &&
      station.cameraId !== selectedCameraId
    ) {
      void selectCamera(station.cameraId);
    }
  }, [station.cameraId, selectedCameraId, status, cameraSource, selectCamera]);

  const { stations, isStationLive } = stationsCtx;
  const availableCameras = useMemo(() => {
    const taken = camerasHeldByOtherStations(
      stations,
      isStationLive,
      stationId,
    );
    return cameras.filter((c) => !taken.has(c.deviceId));
  }, [cameras, stations, isStationLive, stationId]);

  return (
    <CameraContext
      value={{
        stream,
        status,
        errorMessage,
        focusRange,
        focusDistance,
        cameras: availableCameras,
        selectedCameraId,
        setFocusDistance,
        selectCamera,
        retryCamera,
        stopCamera,
        cameraSource,
        phonePairingStatus,
        phonePairingUrl,
        startPhonePairing,
        stopPhonePairing,
        requestPhoneCapture,
        sendPhoneScanRegion,
      }}
    >
      {children}
    </CameraContext>
  );
}

export function useCameraContext() {
  const ctx = useContext(CameraContext);
  if (!ctx)
    throw new Error("useCameraContext must be used within a CameraProvider");
  return ctx;
}
