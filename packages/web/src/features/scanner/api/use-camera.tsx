import { useCollections } from "@/features/collections/api/use-collections";
import { usePhoneCameraCapture } from "@/features/scanner/api/use-phone-camera-capture";
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

        // Enumerate cameras after permission is granted so labels are available
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
    [t, stationId, otherStationCameraIds],
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

  const stopCamera = useCallback(() => {
    if (cameraSource === "phone") {
      stopPhonePairingInternal();
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
      setStream(null);
    }
    setCameraSource("local");
    setStatus("idle");
    setErrorMessage("");
  }, [cameraSource, stopPhonePairingInternal]);

  const retryCamera = useCallback(async () => {
    stopCamera();
    await startCamera(selectedCameraId ?? undefined);
  }, [startCamera, stopCamera, selectedCameraId]);

  // There's no stream to hand off any more - the phone only ever sends one
  // photo at a time, on request (see use-phone-camera-capture.ts). Flipping
  // cameraSource here is purely a declaration of intent; useCardScanner
  // reacts to phonePairingStatus separately to know when it's actually safe
  // to scan.
  const startPhonePairing = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
      setStream(null);
    }
    setErrorMessage("");
    setCameraSource("phone");
    startPhonePairingInternal();
  }, [startPhonePairingInternal]);

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
    // Mobile is redirected to the read-only monitor view and never scans -
    // don't prompt for camera access it'll never use.
    // The idle standby station holds no camera until it's connected or viewed.
    if (isMobile || !isLive) return;

    void startCamera(stationCameraIdRef.current ?? undefined);

    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
      setStream(null);
      setStatus("idle");
    };
  }, [startCamera, isMobile, isLive]);

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
