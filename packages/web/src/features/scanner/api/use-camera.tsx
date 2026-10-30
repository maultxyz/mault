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
import {
  DOCUMENT_SCANNERS_QUERY_KEY,
  FLATBED_DEFAULT_PLACEMENT,
  PI_CAMERA_DEVICE_ID,
} from "@/lib/constants/scanner";
import {
  documentScannerKey,
  documentScannerModeOf,
  documentScannerOptionsFor,
  getDocumentScannerSessionBridge,
  isDocumentScannerCameraId,
  requireDocumentScannerSessionBridge,
} from "@/features/scanner/lib/document-scan-bridge";
import {
  cropFlatbedPage,
  flatbedScanHeightMm,
  loadFlatbedPlacement,
  storeFlatbedPlacement,
} from "@/features/scanner/lib/flatbed-placement";
import { generateScanId } from "@/lib/utils";
import type {
  DesktopDocumentScannerCaptureRequest,
  DesktopDocumentScannerFeedResult,
} from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  DocumentScannerOption,
  DocumentScannerSessionState,
  FlatbedPlacement,
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
  const queryClient = useQueryClient();
  const documentScannerBridge = useMemo(getDocumentScannerSessionBridge, []);
  const documentScannerSessionRef = useRef<DocumentScannerSessionState | null>(
    null,
  );
  const documentScannerPageRef = useRef<File | null>(null);
  const { data: documentScannerList } = useQuery({
    queryKey: DOCUMENT_SCANNERS_QUERY_KEY,
    queryFn: () =>
      requireDocumentScannerSessionBridge(documentScannerBridge).listDocumentScanners(),
    enabled: !!documentScannerBridge,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const documentScannerOptions = useMemo<DocumentScannerOption[]>(
    () => documentScannerOptionsFor(documentScannerList?.scanners ?? []),
    [documentScannerList],
  );
  const selectedDocumentScannerOption =
    cameraSource === "document-scanner"
      ? (documentScannerOptions.find((option) => option.cameraId === selectedCameraId) ??
        null)
      : null;
  const selectedDocumentScanner = selectedDocumentScannerOption?.scanner ?? null;
  const documentScannerMode =
    cameraSource === "document-scanner" ? documentScannerModeOf(selectedCameraId) : null;
  const isSimulatedDocumentScanner = !!selectedDocumentScanner?.isSimulated;
  const selectedScannerKey = selectedDocumentScanner
    ? documentScannerKey(selectedDocumentScanner)
    : null;
  const [placementsByScanner, setPlacementsByScanner] = useState<
    Record<string, FlatbedPlacement | null>
  >({});
  const flatbedPlacement =
    documentScannerMode === "flatbed" && selectedScannerKey
      ? (selectedScannerKey in placementsByScanner
          ? placementsByScanner[selectedScannerKey]
          : loadFlatbedPlacement(selectedScannerKey))
      : null;
  const flatbedPlacementRef = useRef(flatbedPlacement);
  flatbedPlacementRef.current = flatbedPlacement;
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

  const closeDocumentScannerSession = useCallback(() => {
    const session = documentScannerSessionRef.current;
    documentScannerSessionRef.current = null;
    documentScannerPageRef.current = null;
    if (session) documentScannerBridge?.closeDocumentScannerSession(session.sessionId);
  }, [documentScannerBridge]);

  const openDocumentScanner = useCallback(
    async (cameraId: string) => {
      setStatus("requesting");
      setErrorMessage("");
      setCameraSource("document-scanner");
      setSelectedCameraId(cameraId);
      try {
        const bridge = requireDocumentScannerSessionBridge(documentScannerBridge);
        const { scanners } = await queryClient.fetchQuery({
          queryKey: DOCUMENT_SCANNERS_QUERY_KEY,
          queryFn: () => bridge.listDocumentScanners(),
          staleTime: Number.POSITIVE_INFINITY,
        });
        const scanner = documentScannerOptionsFor(scanners).find(
          (option) => option.cameraId === cameraId,
        )?.scanner;
        if (!scanner) throw new Error(`Document scanner ${cameraId} is not connected`);
        const session: DocumentScannerSessionState = {
          sessionId: generateScanId(),
          cameraId,
        };
        await bridge.openDocumentScannerSession({
          sessionId: session.sessionId,
          scanner: {
            scannerId: scanner.scannerId,
            scannerName: scanner.name,
            driver: scanner.driver,
          },
        });
        documentScannerSessionRef.current = session;
        documentScannerPageRef.current = null;
        stationsRef.current.setStationCamera(stationId, cameraId);
        setStatus("ready");
      } catch (err) {
        console.error("[camera] document scanner failed to open:", err);
        setErrorMessage(t("camera.documentScannerUnavailable"));
        setStatus("error");
      }
    },
    [documentScannerBridge, queryClient, stationId, t],
  );

  const captureDocumentScannerPage = useCallback(
    async (
      request: DesktopDocumentScannerCaptureRequest,
    ): Promise<{ result: DesktopDocumentScannerFeedResult; page: File | null }> => {
      const session = documentScannerSessionRef.current;
      if (!session || !documentScannerBridge) {
        return { result: { type: "error", reason: "session_closed" }, page: null };
      }
      const result = await documentScannerBridge.feedDocumentScannerCard(
        session.sessionId,
        request,
      );
      if (result.type !== "page") return { result, page: null };
      const page = new File([result.imageBytes.slice()], result.fileName, {
        type: result.mimeType,
      });
      return { result, page };
    },
    [documentScannerBridge],
  );

  const feedDocumentScannerCard = useCallback(async () => {
    const { result, page } = await captureDocumentScannerPage({ kind: "feeder" });
    if (page) documentScannerPageRef.current = page;
    return result;
  }, [captureDocumentScannerPage]);

  const scanFlatbedCard = useCallback(async (): Promise<DesktopDocumentScannerFeedResult> => {
    const placement = flatbedPlacementRef.current ?? FLATBED_DEFAULT_PLACEMENT;
    const { result, page } = await captureDocumentScannerPage({
      kind: "flatbed",
      scanHeightMm: flatbedScanHeightMm(placement),
    });
    if (!page || result.type !== "page") return result;
    try {
      documentScannerPageRef.current = result.scanWidthMm
        ? await cropFlatbedPage(page, result.scanWidthMm, placement)
        : page;
    } catch (error) {
      console.error("[camera] cropping the flatbed scan failed:", error);
      return { type: "error", reason: "unknown", message: String(error) };
    }
    return result;
  }, [captureDocumentScannerPage]);

  const previewFlatbedGlass = useCallback(
    async () => (await captureDocumentScannerPage({ kind: "flatbed-preview" })).result,
    [captureDocumentScannerPage],
  );

  const saveFlatbedPlacement = useCallback(
    (placement: FlatbedPlacement) => {
      if (!selectedScannerKey) return;
      storeFlatbedPlacement(selectedScannerKey, placement);
      setPlacementsByScanner((previous) => ({
        ...previous,
        [selectedScannerKey]: placement,
      }));
    },
    [selectedScannerKey],
  );

  const takeDocumentScannerPage = useCallback(() => {
    const page = documentScannerPageRef.current;
    documentScannerPageRef.current = null;
    return page;
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      if (isDocumentScannerCameraId(deviceId)) {
        if (deviceId) await openDocumentScanner(deviceId);
        return;
      }
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
    [t, stationId, otherStationCameraIds, isMobile, openDocumentScanner],
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
    closeDocumentScannerSession();
    releaseLocalStream();
    setCameraSource("local");
    setStatus("idle");
    setErrorMessage("");
  }, [
    cameraSource,
    stopPhonePairingInternal,
    releaseLocalStream,
    closeDocumentScannerSession,
  ]);

  const retryCamera = useCallback(async () => {
    stopCamera();
    await startCamera(selectedCameraId ?? undefined);
  }, [startCamera, stopCamera, selectedCameraId]);

  const startPhonePairing = useCallback(() => {
    closeDocumentScannerSession();
    releaseLocalStream();
    setErrorMessage("");
    setCameraSource("phone");
    startPhonePairingInternal();
  }, [startPhonePairingInternal, releaseLocalStream, closeDocumentScannerSession]);

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
      closeDocumentScannerSession();
      releaseLocalStream();
      setStatus("idle");
    };
  }, [
    startCamera,
    isMobile,
    isLive,
    piRemote,
    releaseLocalStream,
    closeDocumentScannerSession,
  ]);

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
        documentScannerOptions,
        documentScannerMode,
        isSimulatedDocumentScanner,
        feedDocumentScannerCard,
        scanFlatbedCard,
        previewFlatbedGlass,
        flatbedPlacement,
        saveFlatbedPlacement,
        takeDocumentScannerPage,
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
