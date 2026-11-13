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
  FEEDER_CARD_DEFAULT_SETUP,
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
import { cropScanPageToCard } from "@/features/scanner/lib/scan-page-card-crop";
import {
  feederCardRotationDegrees,
  loadFeederCardSetup,
  rotateScanPage,
  storeFeederCardSetup,
} from "@/features/scanner/lib/feeder-card-setup";
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
  waitForTrackSetup,
} from "@/features/scanner/lib/camera-stream";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePiHost } from "@/hooks/use-pi-host";
import { loadPiHost } from "@/lib/pi-host";
import type {
  CameraContextValue,
  CameraRange,
  CameraSource,
  CameraStatus,
  DocumentScannerOption,
  DocumentScannerPages,
  DocumentScannerSessionState,
  FeederCardSetup,
  FeederCardSetupTestScan,
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
import { toast } from "sonner";

const CameraContext = createContext<CameraContextValue | null>(null);

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("scanner");
  const isMobile = useIsMobile();
  const piRemote = usePiHost();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [focusRange, setFocusRange] = useState<CameraRange | null>(null);
  const [focusDistance, setFocusDistanceState] = useState<number | null>(
    null,
  );
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (browserMustUsePiCamera() || !mediaDevices?.enumerateDevices) return;
    const refreshWebcams = () =>
      void mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const webcams = devices.filter(
            (device) => device.kind === "videoinput" && device.deviceId,
          );
          setCameras((previous) =>
            previous.some((camera) => camera.deviceId === PI_CAMERA_DEVICE_ID)
              ? previous
              : webcams,
          );
        })
        .catch(() => {});
    refreshWebcams();
    mediaDevices.addEventListener("devicechange", refreshWebcams);
    return () => mediaDevices.removeEventListener("devicechange", refreshWebcams);
  }, []);
  const [cameraSource, setCameraSource] = useState<CameraSource>("local");
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStartAttemptRef = useRef(0);
  const queryClient = useQueryClient();
  const documentScannerBridge = useMemo(getDocumentScannerSessionBridge, []);
  const documentScannerSessionRef = useRef<DocumentScannerSessionState | null>(
    null,
  );
  const documentScannerPageRef = useRef<DocumentScannerPages | null>(null);
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
  const [feederSetupsByScanner, setFeederSetupsByScanner] = useState<
    Record<string, FeederCardSetup>
  >({});
  const feederCardSetup = useMemo(
    () =>
      selectedScannerKey
        ? (feederSetupsByScanner[selectedScannerKey] ?? loadFeederCardSetup(selectedScannerKey))
        : FEEDER_CARD_DEFAULT_SETUP,
    [selectedScannerKey, feederSetupsByScanner],
  );
  const feederCardSetupRef = useRef(feederCardSetup);
  feederCardSetupRef.current = feederCardSetup;
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
      const attempt = ++cameraStartAttemptRef.current;
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
        if (attempt !== cameraStartAttemptRef.current) {
          bridge.closeDocumentScannerSession(session.sessionId);
          return;
        }
        documentScannerSessionRef.current = session;
        documentScannerPageRef.current = null;
        stationsRef.current.setStationCamera(stationId, cameraId);
        setStatus("ready");
      } catch (err) {
        if (attempt !== cameraStartAttemptRef.current) return;
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

  const captureFeederCard = useCallback(
    async (
      setup: FeederCardSetup,
    ): Promise<{ result: DesktopDocumentScannerFeedResult; pages: DocumentScannerPages | null }> => {
      const { result, page } = await captureDocumentScannerPage({
        kind: "feeder",
        sheetSide: setup.sheetSide,
      });
      if (!page || result.type !== "page") return { result, pages: null };
      const rotationDegrees = feederCardRotationDegrees(setup);
      try {
        const otherSidePage = result.otherSide
          ? new File([result.otherSide.imageBytes.slice()], result.otherSide.fileName, {
              type: result.otherSide.mimeType,
            })
          : null;
        return {
          result,
          pages: {
            face: await rotateScanPage(await cropScanPageToCard(page), rotationDegrees),
            otherSide: otherSidePage
              ? await rotateScanPage(await cropScanPageToCard(otherSidePage), rotationDegrees)
              : null,
          },
        };
      } catch (error) {
        console.error("[camera] rotating the feeder scan failed:", error);
        return {
          result: { type: "error", reason: "unknown", message: String(error) },
          pages: null,
        };
      }
    },
    [captureDocumentScannerPage],
  );

  const feedDocumentScannerCard = useCallback(async () => {
    const { result, pages } = await captureFeederCard(feederCardSetupRef.current);
    if (pages) documentScannerPageRef.current = pages;
    return result;
  }, [captureFeederCard]);

  const testFeederCardSetup = useCallback(
    async (setup: FeederCardSetup): Promise<FeederCardSetupTestScan> => {
      const { result, page } = await captureDocumentScannerPage({
        kind: "feeder",
        sheetSide: setup.sheetSide,
      });
      if (result.type === "error") return { type: "error", reason: result.reason };
      if (!page) return { type: "error", reason: "unknown" };
      return { type: "page", unrotatedPage: await cropScanPageToCard(page), scannedWith: setup };
    },
    [captureDocumentScannerPage],
  );

  const saveFeederCardSetup = useCallback(
    (setup: FeederCardSetup) => {
      if (!selectedScannerKey) return;
      storeFeederCardSetup(selectedScannerKey, setup);
      setFeederSetupsByScanner((previous) => ({
        ...previous,
        [selectedScannerKey]: setup,
      }));
    },
    [selectedScannerKey],
  );

  const scanFlatbedCard = useCallback(async (): Promise<DesktopDocumentScannerFeedResult> => {
    const placement = flatbedPlacementRef.current ?? FLATBED_DEFAULT_PLACEMENT;
    const { result, page } = await captureDocumentScannerPage({
      kind: "flatbed",
      scanHeightMm: flatbedScanHeightMm(placement),
    });
    if (!page || result.type !== "page") return result;
    try {
      documentScannerPageRef.current = {
        face: result.scanWidthMm
          ? await cropFlatbedPage(page, result.scanWidthMm, placement)
          : page,
        otherSide: null,
      };
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

  const takeDocumentScannerPages = useCallback(() => {
    const pages = documentScannerPageRef.current;
    documentScannerPageRef.current = null;
    return pages;
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      console.warn("[camera] start", { deviceId, stationId });
      if (isDocumentScannerCameraId(deviceId)) {
        if (deviceId) await openDocumentScanner(deviceId);
        return;
      }
      const attempt = ++cameraStartAttemptRef.current;
      const isSuperseded = () => attempt !== cameraStartAttemptRef.current;
      setStatus("requesting");
      setErrorMessage("");
      try {
        await loadPiHost();
        const health = await readPiCameraHealth();
        if (isSuperseded()) return;
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
          if (isSuperseded()) {
            stopMediaStream(mediaStream);
            return;
          }
          streamRef.current = mediaStream;
          setStream(mediaStream);
          setStatus("ready");
          setCameras([piCameraDevice(health.label)]);
          setSelectedCameraId(PI_CAMERA_DEVICE_ID);
          stationsRef.current.setStationCamera(stationId, PI_CAMERA_DEVICE_ID);
          const range = health.focus;
          setFocusRange(range);
          setFocusDistanceState(
            health.focusMode === "manual" ? health.lensPosition ?? null : null,
          );
          return;
        }

        const mediaStream = await acquireFreeStream(
          deviceId === PI_CAMERA_DEVICE_ID ? undefined : deviceId,
          otherStationCameraIds(),
          isMobile,
        );
        if (isSuperseded()) {
          stopMediaStream(mediaStream);
          return;
        }
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
            void waitForTrackSetup(track)
              .then(() => applyTrackFocus(track, savedFocus))
              .catch(() => {});
          }
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter((d) => d.kind === "videoinput"));
      } catch (err) {
        if (isSuperseded()) return;
        console.error("[camera] starting the camera failed:", err);
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
    const track = streamRef.current?.getVideoTracks()[0];
    if (browserMustUsePiCamera() || (track && isPiRelayTrack(track))) {
      void applyPiFocus(value).then(() => {
        setFocusDistanceState(value);
      }).catch(() => toast.error(t("cameraAccessError")));
      return;
    }
    if (!track) return;
    void applyTrackFocus(track, value).catch(() => {});
    saveFocus(
      isPiRelayTrack(track)
        ? PI_CAMERA_DEVICE_ID
        : (track.getSettings().deviceId ?? null),
      value,
    );
    setFocusDistanceState(value);
  }, [t]);

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
    cameraStartAttemptRef.current += 1;
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
      const heldByOtherStations = otherStationCameraIds();
      console.warn("[camera] select", { deviceId, heldByOtherStations: [...heldByOtherStations] });
      if (heldByOtherStations.has(deviceId)) return;
      stopCamera();
      await startCamera(deviceId);
    },
    [startCamera, stopCamera, otherStationCameraIds],
  );

  useEffect(() => {
    if (!isLive || (isMobile && !piRemote)) return;

    void startCamera(stationCameraIdRef.current ?? undefined);

    return () => {
      cameraStartAttemptRef.current += 1;
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
  const { availableCameras, camerasInUseElsewhere } = useMemo(() => {
    const taken = camerasHeldByOtherStations(
      stations,
      isStationLive,
      stationId,
    );
    return {
      availableCameras: cameras.filter((c) => !taken.has(c.deviceId)),
      camerasInUseElsewhere: cameras.filter((c) => taken.has(c.deviceId)),
    };
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
        camerasInUseElsewhere,
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
        feederCardSetup,
        saveFeederCardSetup,
        testFeederCardSetup,
        takeDocumentScannerPages,
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
