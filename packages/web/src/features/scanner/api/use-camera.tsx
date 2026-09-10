import { useCollections } from "@/features/collections/api/use-collections";
import { usePhoneCameraCapture } from "@/features/scanner/api/use-phone-camera-capture";
import type {
  CameraContextValue,
  CameraSource,
  CameraStatus,
  ZoomRange,
} from "@/lib/interfaces/scanner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

const CameraContext = createContext<CameraContextValue | null>(null);

async function acquireStream(deviceId?: string): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      zoom: true,
    } as MediaTrackConstraints,
  });

  const track = stream.getVideoTracks()[0];
  if (track) {
    try {
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
        focusMode?: string[];
        zoom?: { min: number; max: number; step: number };
      };
      const constraints: MediaTrackConstraintSet[] = [];
      if (capabilities.focusMode?.includes("continuous")) {
        constraints.push({ focusMode: "continuous" } as MediaTrackConstraintSet);
      }
      if (capabilities.zoom) {
        constraints.push({ zoom: capabilities.zoom.min } as MediaTrackConstraintSet);
      }
      if (constraints.length > 0) {
        await track.applyConstraints({ advanced: constraints });
      }
    } catch {}
  }

  return stream;
}

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("scanner");
  const isMobile = useIsMobile();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [zoom, setZoomState] = useState(1);
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [cameraSource, setCameraSource] = useState<CameraSource>("local");
  const streamRef = useRef<MediaStream | null>(null);
  const { activeCollection } = useCollections();

  const startCamera = useCallback(async (deviceId?: string) => {
    setStatus("requesting");
    setErrorMessage("");
    try {
      const mediaStream = await acquireStream(deviceId);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus("ready");

      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const activeDeviceId = track.getSettings().deviceId ?? null;
        setSelectedCameraId(activeDeviceId);

        const caps = track.getCapabilities() as MediaTrackCapabilities & {
          zoom?: { min: number; max: number; step: number };
        };
        if (caps.zoom) {
          setZoomRange(caps.zoom);
          setZoomState(caps.zoom.min);
        } else {
          setZoomRange(null);
        }
      }

      // Enumerate cameras after permission is granted so labels are available
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === "videoinput"));
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? t("camera.permissionDenied")
          : t("camera.accessError");
      setErrorMessage(msg);
      setStatus("error");
    }
  }, [t]);

  const setZoom = useCallback((value: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] }).catch(() => {});
    setZoomState(value);
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

  const selectCamera = useCallback(async (deviceId: string) => {
    stopCamera();
    await startCamera(deviceId);
  }, [startCamera, stopCamera]);

  useEffect(() => {
    // Mobile is redirected to the read-only monitor view and never scans -
    // don't prompt for camera access it'll never use.
    if (isMobile) return;

    startCamera();

    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
    };
  }, [startCamera, isMobile]);

  return (
    <CameraContext
      value={{
        stream,
        status,
        errorMessage,
        zoom,
        zoomRange,
        cameras,
        selectedCameraId,
        setZoom,
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
