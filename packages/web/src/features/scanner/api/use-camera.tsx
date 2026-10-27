import { useCollections } from "@/features/collections/api/use-collections";
import {
  usePhoneCameraCapture,
} from "@/features/scanner/api/use-phone-camera-capture";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import {
  loadSavedFocus,
  saveFocus,
} from "@/features/scanner/lib/camera-focus";
import {
  acquirePiRelayStream,
  applyTrackFocus,
  applyPiFocus,
  browserMustUsePiCamera,
  focusRangeForTrack,
  isPiRelayTrack,
  piCameraDevice,
  readPiCameraHealth,
} from "@/features/scanner/lib/pi-camera";
import { PI_CAMERA_DEVICE_ID } from "@/lib/constants/scanner";
import {
  acquireFreeStream,
  camerasHeldByOtherStations,
  stopMediaStream,
} from "@/features/scanner/lib/camera-stream";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePiHost } from "@/hooks/use-pi-host";
import { isRemoteBrowser } from "@/lib/host";
import { loadPiHost } from "@/lib/pi-host";
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
  const piRemote = usePiHost() && isRemoteBrowser();
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
        await loadPiHost();
        const health = await readPiCameraHealth();
        const usePi = health.status === "ready" || browserMustUsePiCamera();
        if (usePi) {
          if (health.status !== "ready") {
            setErrorMessage(t("camera.piUnavailable"));
            setStatus("error");
            return;
          }
          const mediaStream = isMobile && browserMustUsePiCamera()
            ? null
            : await acquirePiRelayStream();
          streamRef.current = mediaStream;
          setStream(mediaStream);
          setStatus("ready");
          setCameras([piCameraDevice(health.label)]);
          setSelectedCameraId(PI_CAMERA_DEVICE_ID);
          stationsRef.current.setStationCamera(stationId, PI_CAMERA_DEVICE_ID);
          const range = health.focus;
          const saved = loadSavedFocus(PI_CAMERA_DEVICE_ID);
          const savedFocus =
            range &&
            saved !== null &&
            saved >= range.min &&
            saved <= range.max
              ? saved
              : null;
          setFocusRange(range);
          setFocusDistanceState(savedFocus);
          if (savedFocus !== null) {
            if (!mediaStream) await applyPiFocus(savedFocus).catch(() => {});
            else {
              const track = mediaStream.getVideoTracks()[0];
              if (track) await applyTrackFocus(track, savedFocus).catch(() => {});
            }
          }
          return;
        }

        const mediaStream = await acquireFreeStream(
          deviceId === PI_CAMERA_DEVICE_ID ? undefined : deviceId,
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

          const range = focusRangeForTrack(track);
          const savedFocus = range ? loadSavedFocus(activeDeviceId) : null;
          setFocusRange(range);
          setFocusDistanceState(savedFocus);
          if (savedFocus !== null) {
            await applyTrackFocus(track, savedFocus).catch(() => {});
          }
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter((d) => d.kind === "videoinput"));
      } catch (err) {
        const msg =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? t("camera.permissionDenied")
            : browserMustUsePiCamera()
              ? t("camera.piUnavailable")
              : t("cameraAccessError");
        setErrorMessage(msg);
        setStatus("error");
      }
    },
    [t, stationId, otherStationCameraIds, isMobile],
  );

  const setFocusDistance = useCallback((value: number | null) => {
    if (browserMustUsePiCamera()) {
      void applyPiFocus(value).catch(() => {});
      saveFocus(PI_CAMERA_DEVICE_ID, value);
      setFocusDistanceState(value);
      return;
    }
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    void applyTrackFocus(track, value).catch(() => {});
    saveFocus(
      isPiRelayTrack(track)
        ? PI_CAMERA_DEVICE_ID
        : (track.getSettings().deviceId ?? null),
      value,
    );
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
    if (!isLive || (isMobile && !piRemote)) return;

    void startCamera(stationCameraIdRef.current ?? undefined);

    return () => {
      releaseLocalStream();
      setStatus("idle");
    };
  }, [startCamera, isMobile, isLive, piRemote, releaseLocalStream]);

  useEffect(() => {
    if (selectedCameraId === PI_CAMERA_DEVICE_ID) return;
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
