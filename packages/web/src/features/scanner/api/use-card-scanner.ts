import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { billingQueryOptions } from "@/features/billing/api/billing";
import { useDevice } from "@/features/calibration/api/use-device";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useStation } from "@/features/scanner/api/use-stations";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { drawDetectionOverlay } from "@/features/scanner/lib/card-detection";
import {
  captureDewarpedCardImage,
  searchCardImageWithConsensus,
} from "@/features/scanner/lib/card-image-search";
import { detectCardCorners } from "@/features/scanner/lib/cornelius";
import { getOnnxRuntimeFailure } from "@/features/scanner/lib/onnx-runtime";
import { createOutlineAnimator } from "@/features/scanner/lib/outline-animator";
import { startVideoPreviewLoop } from "@/features/scanner/lib/video-preview-loop";
import {
  contourFingerprint,
  fingerprintDistance,
} from "@/features/scanner/lib/hand-scan";
import { readScannerControlCode } from "@/features/scanner/lib/scanner-control-code";
import { useFoilDetectionGameKey } from "@/features/scanner/api/use-foil-detection-game-key";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import { drawScanImageFile } from "@/features/scanner/lib/scan-image-file";
import {
  orientDocumentScanImages,
  scanPageImageDataUrl,
} from "@/features/scanner/lib/scan-page-card-image";
import {
  HAND_SCAN_REARM_FINGERPRINT_DIFF,
  HAND_SCAN_TRACKING_STATUSES,
  SCANNABLE_STATUSES,
  SCANNER_LIVE_DETECTION_INTERVAL_MS,
  LIVE_DETECTION_STATUSES,
} from "@/lib/constants/scanner";
import {
  drawVideoFrame,
  fitCanvasesToContainer,
  observeContainerResize,
} from "@/features/scanner/lib/canvas-fit";
import { scanLog } from "@/lib/scan-log";
import type {
  DocumentScanSavedImages,
  VideoPreviewLoop,
} from "@/lib/interfaces/scanner";
import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_SCAN_REGION,
  getDefaultCardContour,
  OCR_REGIONS_BY_GAME_KEY,
  type CardContour,
  type CardScannerProps,
  type CornerDetection,
  HAND_SCAN_MAX_CORNER_SHIFT_RATIO,
  HAND_SCAN_REARM_SHIFT_RATIO,
  HAND_SCAN_REMOVAL_TICKS,
  HAND_SCAN_STABLE_TICKS,
  maxCornerShift,
  parseScannerControlCode,
  type PlayingCardWithDistance,
  type ScanRegion,
  type ScannerStatus,
  type ScanVectorizeSource,
  presetMatchGameKeys,
  readsPrintedLanguageEveryScan,
  scanOcrMode,
  type ScanOcrMode,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

let sharedAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContext();
  }
  return sharedAudioCtx;
}

function playDingSound() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, ctx.currentTime);
  oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);
}

export function useCardScanner({
  onSearchResults,
  onNoMatch,
  onControlCode,
  checkFoilByNudge,
  onError,
  rotated = true,
  scanRegion: scanRegionProp,
  autoCapture = false,
  skipDuplicateCheck = false,
}: Omit<CardScannerProps, "className"> & {
  rotated?: boolean;
  scanRegion?: ScanRegion;
  autoCapture?: boolean;
  skipDuplicateCheck?: boolean;
} = {}) {
  const { t } = useTranslation("scanner");
  const {
    stream,
    status: cameraStatus,
    errorMessage: cameraError,
    cameras,
    selectedCameraId,
    selectCamera,
    retryCamera,
    stopCamera,
    cameraSource,
    phonePairingStatus,
    phonePairingUrl,
    startPhonePairing,
    stopPhonePairing,
    requestPhoneCapture,
    takeDocumentScannerPages,
  } = useCameraContext();
  const { activeCollection } = useCollections();
  const { forceSetCodes: preferredSetCodes } = useScannedCards();
  const { selectedSet: activePreset } = useBinConfigs();
  const matchGameKeysRef = useRef<string[]>([]);
  matchGameKeysRef.current = presetMatchGameKeys(activePreset);
  const { activeOrg } = useOrg();
  const device = useDevice();
  const { isActive: isActiveStation } = useStation();
  const isActiveStationRef = useRef(isActiveStation);
  isActiveStationRef.current = isActiveStation;
  const { data: billingData } = useQuery(billingQueryOptions(activeOrg?.id));

  const isAtScanLimit =
    billingData?.dailyLimit != null &&
    billingData.cardsScannedToday >= billingData.dailyLimit;
  const isAtScanLimitRef = useRef(isAtScanLimit);
  isAtScanLimitRef.current = isAtScanLimit;

  const rotatedRef = useRef(rotated);
  rotatedRef.current = rotated;

  const autoCaptureRef = useRef(autoCapture);
  autoCaptureRef.current = autoCapture;
  const skipDuplicateCheckRef = useRef(skipDuplicateCheck);
  skipDuplicateCheckRef.current = skipDuplicateCheck;
  const handScanArmedRef = useRef(true);
  const handScanStableTicksRef = useRef(0);
  const handScanAbsentTicksRef = useRef(0);
  const handScanLastContourRef = useRef<CardContour | null>(null);
  const handScanCapturedContourRef = useRef<CardContour | null>(null);
  const handScanCapturedFingerprintRef = useRef<Float32Array | null>(null);
  const captureCardRef = useRef<() => void>(() => {});

  const scanRegion =
    scanRegionProp ?? device?.scanRegion ?? DEFAULT_SCAN_REGION;
  const scanRegionRef = useRef(scanRegion);
  scanRegionRef.current = scanRegion;

  const captureSettleDelayMs =
    device?.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS;
  const captureSettleDelayMsRef = useRef(captureSettleDelayMs);
  captureSettleDelayMsRef.current = captureSettleDelayMs;

  const matchesNeeded = device?.matchesNeeded ?? DEFAULT_MATCHES_NEEDED;
  const matchesNeededRef = useRef(matchesNeeded);
  matchesNeededRef.current = matchesNeeded;

  const checkBothOrientations =
    device?.checkBothOrientations ?? DEFAULT_CHECK_BOTH_ORIENTATIONS;
  const checkBothOrientationsRef = useRef(checkBothOrientations);
  checkBothOrientationsRef.current = checkBothOrientations;

  const flipCameraRef = useRef(device?.flipCamera ?? false);
  flipCameraRef.current = device?.flipCamera ?? false;

  const activeCollectionGuidRef = useRef(activeCollection?.guid);
  activeCollectionGuidRef.current = activeCollection?.guid;
  const preferredSetCodesRef = useRef(preferredSetCodes);
  preferredSetCodesRef.current = preferredSetCodes;

  const gameKeyRef = useRef<string | undefined>(undefined);
  gameKeyRef.current = activeCollection?.game?.key;

  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [outlineAnimator] = useState(() =>
    createOutlineAnimator(() => overlayCanvasRef.current),
  );
  const previewLoopRef = useRef<VideoPreviewLoop | null>(null);
  const liveOutlineShownRef = useRef(false);

  const statusRef = useRef<ScannerStatus>("initializing");
  const lastScannedCardIdRef = useRef<string | null>(null);
  const isCapturingRef = useRef(false);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchResultsRef = useRef(onSearchResults);
  const onNoMatchRef = useRef(onNoMatch);
  const onControlCodeRef = useRef(onControlCode);
  const checkFoilByNudgeRef = useRef(checkFoilByNudge);
  checkFoilByNudgeRef.current = checkFoilByNudge;
  const handleErrorRef = useRef<(msg: string) => void>(() => {});

  const [status, setStatus] = useState<ScannerStatus>("initializing");
  const [errorMessage, setErrorMessage] = useState("");
  const [duplicateCard, setDuplicateCard] =
    useState<PlayingCardWithDistance | null>(null);
  const [debugImageUrl, setDebugImageUrl] = useState<string | null>(null);
  const capturedImageUrlRef = useRef<string | null>(null);
  const vectorizedOnRef = useRef<ScanVectorizeSource | undefined>(undefined);
  const capturedBackImageUrlRef = useRef<string | undefined>(undefined);
  const [allowDuplicates, setAllowDuplicates] = useState(true);
  const { data: orgSettings } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );
  const ocrSupported =
    (OCR_REGIONS_BY_GAME_KEY[activeCollection?.game?.key ?? ""]?.length ?? 0) >
    0;
  const ocrModeRef = useRef<ScanOcrMode>("off");
  ocrModeRef.current = scanOcrMode(
    orgSettings,
    ocrSupported,
    readsPrintedLanguageEveryScan(activeCollection, activeCollection?.game?.key),
  );
  const foilDetectionGameKey = useFoilDetectionGameKey(activeCollection?.game?.key);
  const foilDetectionGameKeyRef = useRef(foilDetectionGameKey);
  foilDetectionGameKeyRef.current = foilDetectionGameKey;
  const [hasStillPhoto, setHasStillPhoto] = useState(false);

  useEffect(() => {
    if (cameraSource === "local") setHasStillPhoto(false);
  }, [cameraSource]);

  const tRef = useRef(t);
  tRef.current = t;

  const updateStatus = useCallback((newStatus: ScannerStatus) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
  }, []);

  const handleError = useCallback(
    (msg: string) => {
      updateStatus("error");
      setErrorMessage(msg);
      onError?.(msg);
    },
    [onError, updateStatus],
  );

  useEffect(() => {
    onSearchResultsRef.current = onSearchResults;
  }, [onSearchResults]);

  useEffect(() => {
    onNoMatchRef.current = onNoMatch;
  }, [onNoMatch]);

  useEffect(() => {
    onControlCodeRef.current = onControlCode;
  }, [onControlCode]);

  useEffect(() => {
    handleErrorRef.current = handleError;
  }, [handleError]);

  useEffect(() => {
    if (cameraSource === "phone") return;
    if (cameraStatus === "requesting") {
      updateStatus("requesting-camera");
    } else if (cameraStatus === "error") {
      updateStatus("error");
      setErrorMessage(cameraError);
    } else if (cameraStatus === "idle") {
      updateStatus("initializing");
    }
  }, [cameraStatus, cameraError, cameraSource, updateStatus]);

  useEffect(() => {
    if (cameraSource !== "phone") return;
    updateStatus(
      phonePairingStatus === "connected" ? "paused" : "initializing",
    );
  }, [cameraSource, phonePairingStatus, updateStatus]);

  useEffect(() => {
    if (cameraSource === "document-scanner" && cameraStatus === "ready") {
      updateStatus("paused");
    }
  }, [cameraSource, cameraStatus, updateStatus]);

  const drawLatestVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = displayCanvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (ctx) drawVideoFrame(ctx, video, flipCameraRef.current);
  }, []);

  const performCapture = useCallback(
    async (
      checkDuplicate: boolean,
      contour: CardContour | null | undefined,
      fromLiveVideo: boolean,
      documentScanImages?: DocumentScanSavedImages,
    ) => {
      const isDocumentScan = !!documentScanImages;
      const { savedImageUrl, capturedBackImageUrl: scannedBackImageUrl } = documentScanImages ?? {};
      const canvas = displayCanvasRef.current;
      if (!canvas) {
        isCapturingRef.current = false;
        updateStatus("scanning");
        return;
      }

      try {
        if (fromLiveVideo) drawLatestVideoFrame();
        const controlCode = readScannerControlCode(canvas);
        if (controlCode) {
          lastScannedCardIdRef.current = null;
          scanLog(`[scanner] control card read: ${controlCode}`);
          onControlCodeRef.current?.(parseScannerControlCode(controlCode));
          if (statusRef.current !== "paused") updateStatus("scanning");
          return;
        }
        const {
          card,
          alternativeMatches,
          debugImageUrl,
          detectedContour,
          vectorizedOn,
          dewarpedCardImage,
          matched,
          noMatch,
        } = await searchCardImageWithConsensus(
          canvas,
          fromLiveVideo ? drawLatestVideoFrame : () => {},
          contour,
          {
            collectionGuid: activeCollectionGuidRef.current,
            preferredSetCodes: preferredSetCodesRef.current,
            matchGameKeys: matchGameKeysRef.current,
          },
          ocrModeRef.current,
          matchesNeededRef.current,
          isDocumentScan || checkBothOrientationsRef.current,
          gameKeyRef.current,
        );
        setDebugImageUrl(debugImageUrl);
        const { capturedImageUrl, capturedBackImageUrl } = await orientDocumentScanImages(
          savedImageUrl,
          scannedBackImageUrl,
          matched ? debugImageUrl : null,
          debugImageUrl,
        );
        capturedImageUrlRef.current = capturedImageUrl;
        capturedBackImageUrlRef.current = capturedBackImageUrl;
        vectorizedOnRef.current = vectorizedOn;

        outlineAnimator.cancel();
        const overlayCtx = overlayCanvasRef.current?.getContext("2d");
        if (overlayCtx && canvas.width && canvas.height) {
          overlayCtx.clearRect(0, 0, canvas.width, canvas.height);
          if (detectedContour) {
            drawDetectionOverlay(overlayCtx, {
              detected: true,
              contour: detectedContour,
              confidence: 1,
            });
          }
        }

        const pausedMidSearch = statusRef.current === "paused";
        if (card) {
          if (
            checkDuplicate &&
            !allowDuplicates &&
            !skipDuplicateCheckRef.current &&
            lastScannedCardIdRef.current === card.id
          ) {
            setDuplicateCard(card);
            if (!pausedMidSearch) updateStatus("duplicate");
          } else {
            lastScannedCardIdRef.current = card.id;
            if (matched?.lowConfidenceMatch) {
              scanLog(
                `[scanner] OCR name match used without an embedding match, flagged for review: ${card.name} (${card.id})`,
              );
            }
            const foilDetection =
              fromLiveVideo && matched && dewarpedCardImage
                ? await checkFoilByNudgeRef.current?.(
                    card,
                    () =>
                      captureDewarpedCardImage(canvas, drawLatestVideoFrame),
                    dewarpedCardImage,
                  )
                : null;
            onSearchResultsRef.current?.(
              [card, ...alternativeMatches],
              capturedImageUrl,
              vectorizedOn,
              matched && foilDetection
                ? {
                    ...matched,
                    diagnostics: { ...matched.diagnostics, foilDetection },
                  }
                : (matched ?? undefined),
              capturedBackImageUrl,
            );
            if (!pausedMidSearch) updateStatus("scanning");
          }
        } else {
          playDingSound();
          onNoMatchRef.current?.(
            capturedImageUrl,
            vectorizedOn,
            noMatch ?? undefined,
            capturedBackImageUrl,
          );
          if (!pausedMidSearch) updateStatus("no-match");
        }
      } catch (err) {
        handleErrorRef.current(
          err instanceof Error ? err.message : t("scanEngine.searchFailed"),
        );
      } finally {
        isCapturingRef.current = false;
      }
    },
    [updateStatus, allowDuplicates, drawLatestVideoFrame, outlineAnimator, t],
  );

  useEffect(() => {
    const redrawForVisibility = () => previewLoopRef.current?.drawNow();
    redrawForVisibility();
    document.addEventListener("visibilitychange", redrawForVisibility);
    return () =>
      document.removeEventListener("visibilitychange", redrawForVisibility);
  }, [isActiveStation]);

  useEffect(() => {
    if (!stream) return;

    let cancelled = false;
    let stopObservingResize: () => void = () => {};
    const video = videoRef.current;
    if (!video) return;

    updateStatus("initializing");
    video.srcObject = stream;

    (async () => {
      try {
        await video.play();
        if (cancelled) return;

        const { videoWidth, videoHeight } = video;
        for (const ref of [displayCanvasRef, overlayCanvasRef]) {
          if (ref.current) {
            ref.current.width = videoWidth;
            ref.current.height = videoHeight;
          }
        }

        const fit = () =>
          fitCanvasesToContainer(
            [displayCanvasRef.current, overlayCanvasRef.current],
            videoWidth,
            videoHeight,
            rotatedRef.current,
          );
        fit();
        stopObservingResize = observeContainerResize(
          displayCanvasRef.current,
          fit,
        );

        updateStatus("paused");
        previewLoopRef.current = startVideoPreviewLoop({
          video,
          drawFrame: () => {
            const displayCtx = displayCanvasRef.current?.getContext("2d");
            if (!displayCtx) return false;
            drawVideoFrame(displayCtx, video, flipCameraRef.current);
            return true;
          },
          isForeground: () =>
            isActiveStationRef.current &&
            document.visibilityState === "visible",
        });
      } catch (err) {
        if (!cancelled) {
          handleErrorRef.current(
            err instanceof Error
              ? err.message
              : tRef.current("scanEngine.videoStartFailed"),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      stopObservingResize();
      outlineAnimator.cancel();
      previewLoopRef.current?.stop();
      previewLoopRef.current = null;
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
        isCapturingRef.current = false;
      }
      video.srcObject = null;
    };
  }, [stream, updateStatus, outlineAnimator]);

  const liveDetectingRef = useRef(false);
  useEffect(() => {
    if (!stream) return;

    const intervalId = setInterval(() => {
      if (liveDetectingRef.current || getOnnxRuntimeFailure()) return;
      const outlineVisible = stationIsVisible();
      if (!outlineVisible || statusRef.current === "paused") {
        clearLiveOutline();
      }
      if (!isTrackedStatus()) return;
      if (!outlineVisible && !autoCaptureRef.current) return;

      const canvas = displayCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (!canvas || !overlayCanvas || !canvas.width || !canvas.height) return;
      if (!outlineVisible) drawLatestVideoFrame();

      liveDetectingRef.current = true;
      detectCardCorners(canvas)
        .then((detection) => {
          if (!isTrackedStatus()) return;
          if (autoCaptureRef.current) trackHandScan(detection, canvas);
          if (
            !LIVE_DETECTION_STATUSES.includes(statusRef.current) ||
            !stationIsVisible()
          ) {
            return;
          }
          outlineAnimator.setTarget(
            detection.cardPresent ? detection.contour : null,
          );
          liveOutlineShownRef.current = detection.cardPresent;
        })
        .catch((err) => {
          if (!getOnnxRuntimeFailure()) {
            console.error("[scanner] live detection failed:", err);
          }
        })
        .finally(() => {
          liveDetectingRef.current = false;
        });
    }, SCANNER_LIVE_DETECTION_INTERVAL_MS);

    function stationIsVisible() {
      return (
        isActiveStationRef.current && document.visibilityState === "visible"
      );
    }

    function clearLiveOutline() {
      if (!liveOutlineShownRef.current) return;
      liveOutlineShownRef.current = false;
      outlineAnimator.setTarget(null);
    }

    function isTrackedStatus() {
      return autoCaptureRef.current
        ? HAND_SCAN_TRACKING_STATUSES.includes(statusRef.current)
        : LIVE_DETECTION_STATUSES.includes(statusRef.current);
    }

    function cardChangedSinceCapture(
      contour: CardContour,
      canvas: HTMLCanvasElement,
    ) {
      const capturedContour = handScanCapturedContourRef.current;
      if (!capturedContour) return true;
      const rearmShift =
        Math.max(canvas.width, canvas.height) * HAND_SCAN_REARM_SHIFT_RATIO;
      if (maxCornerShift(capturedContour, contour) > rearmShift) return true;
      const capturedFingerprint = handScanCapturedFingerprintRef.current;
      const fingerprint = contourFingerprint(canvas, contour);
      return (
        !!capturedFingerprint &&
        !!fingerprint &&
        fingerprintDistance(capturedFingerprint, fingerprint) >
          HAND_SCAN_REARM_FINGERPRINT_DIFF
      );
    }

    function trackHandScan(
      detection: CornerDetection,
      canvas: HTMLCanvasElement,
    ) {
      if (!detection.cardPresent || !detection.contour) {
        handScanStableTicksRef.current = 0;
        handScanLastContourRef.current = null;
        handScanAbsentTicksRef.current++;
        if (handScanAbsentTicksRef.current >= HAND_SCAN_REMOVAL_TICKS)
          handScanArmedRef.current = true;
        return;
      }
      handScanAbsentTicksRef.current = 0;
      const previous = handScanLastContourRef.current;
      handScanLastContourRef.current = detection.contour;
      if (
        !handScanArmedRef.current &&
        SCANNABLE_STATUSES.includes(statusRef.current) &&
        cardChangedSinceCapture(detection.contour, canvas)
      ) {
        handScanArmedRef.current = true;
      }
      if (
        !handScanArmedRef.current ||
        !SCANNABLE_STATUSES.includes(statusRef.current)
      ) {
        handScanStableTicksRef.current = 0;
        return;
      }
      const maxShift =
        Math.max(canvas.width, canvas.height) *
        HAND_SCAN_MAX_CORNER_SHIFT_RATIO;
      const isStill =
        previous !== null &&
        maxCornerShift(previous, detection.contour) <= maxShift;
      handScanStableTicksRef.current = isStill
        ? handScanStableTicksRef.current + 1
        : 0;
      if (handScanStableTicksRef.current < HAND_SCAN_STABLE_TICKS) return;
      handScanStableTicksRef.current = 0;
      handScanArmedRef.current = false;
      handScanCapturedContourRef.current = detection.contour;
      handScanCapturedFingerprintRef.current = contourFingerprint(
        canvas,
        detection.contour,
      );
      captureCardRef.current();
    }

    return () => clearInterval(intervalId);
  }, [stream, outlineAnimator, drawLatestVideoFrame]);

  const handleForceAddDuplicate = useCallback(() => {
    if (duplicateCard) {
      onSearchResultsRef.current?.(
        [duplicateCard],
        capturedImageUrlRef.current ?? undefined,
        vectorizedOnRef.current,
        undefined,
        capturedBackImageUrlRef.current,
      );
      setDuplicateCard(null);
      updateStatus("scanning");
    }
  }, [duplicateCard, updateStatus]);

  const showStillImage = useCallback(
    (
      image: CanvasImageSource,
      width: number,
      height: number,
      contourForImage: CardContour | null,
    ): CardContour | null => {
      const canvas = displayCanvasRef.current;
      if (!canvas) return null;
      const overlayCanvas = overlayCanvasRef.current;

      canvas.width = width;
      canvas.height = height;
      if (overlayCanvas) {
        overlayCanvas.width = width;
        overlayCanvas.height = height;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(image, 0, 0);
      setHasStillPhoto(true);

      const contour =
        contourForImage ??
        getDefaultCardContour(canvas.width, canvas.height, scanRegionRef.current);

      outlineAnimator.cancel();
      const overlayCtx = overlayCanvas?.getContext("2d");
      if (overlayCanvas && overlayCtx) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        drawDetectionOverlay(overlayCtx, {
          detected: true,
          contour,
          confidence: 1,
        });
      }

      const container = canvas.parentElement;
      if (container) {
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const scale = Math.max(cw / canvas.width, ch / canvas.height);
        const cssW = Math.round(canvas.width * scale);
        const cssH = Math.round(canvas.height * scale);
        for (const el of [canvas, overlayCanvas]) {
          if (!el) continue;
          el.style.width = `${cssW}px`;
          el.style.height = `${cssH}px`;
          el.style.left = `${(cw - cssW) / 2}px`;
          el.style.top = `${(ch - cssH) / 2}px`;
        }
      }

      return contour;
    },
    [outlineAnimator],
  );

  const drawImageToCanvas = useCallback(
    (dataUrl: string): Promise<CardContour | null> =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () =>
          resolve(showStillImage(img, img.naturalWidth, img.naturalHeight, null));
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      }),
    [showStillImage],
  );

  const captureDocumentScannerPageThenSearch = useCallback(
    async (checkDuplicate: boolean) => {
      const pages = takeDocumentScannerPages();
      if (!pages) {
        isCapturingRef.current = false;
        handleErrorRef.current(t("scanEngine.documentScannerNoPage"));
        return;
      }
      const savedImageUrl = await scanPageImageDataUrl(pages.face);
      const capturedBackImageUrl = pages.otherSide
        ? await scanPageImageDataUrl(pages.otherSide)
        : undefined;
      const source = await drawScanImageFile(pages.face).catch(() => null);
      if (!source) {
        isCapturingRef.current = false;
        handleErrorRef.current(t("scanEngine.documentScannerPageUnreadable"));
        return;
      }
      const contour = showStillImage(
        source.canvas,
        source.canvas.width,
        source.canvas.height,
        source.imageContour,
      );
      releaseCanvases([source.canvas]);
      await performCapture(checkDuplicate, contour, false, {
        savedImageUrl,
        capturedBackImageUrl,
      });
    },
    [takeDocumentScannerPages, showStillImage, performCapture, t],
  );

  const capturePhonePhotoThenSearch = useCallback(
    (checkDuplicate: boolean) => {
      requestPhoneCapture().then(async (dataUrl) => {
        if (!dataUrl) {
          isCapturingRef.current = false;
          handleErrorRef.current(t("scanEngine.phoneCaptureFailed"));
          return;
        }
        const contour = await drawImageToCanvas(dataUrl);
        performCapture(checkDuplicate, contour, false);
      });
    },
    [requestPhoneCapture, drawImageToCanvas, performCapture, t],
  );

  const handleForceScan = useCallback(() => {
    if (
      isCapturingRef.current ||
      isAtScanLimitRef.current ||
      !SCANNABLE_STATUSES.includes(statusRef.current)
    )
      return;

    isCapturingRef.current = true;
    updateStatus("searching");
    setDuplicateCard(null);

    if (cameraSource === "phone") {
      capturePhonePhotoThenSearch(false);
      return;
    }

    if (cameraSource === "document-scanner") {
      void captureDocumentScannerPageThenSearch(false);
      return;
    }

    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    performCapture(
      false,
      getDefaultCardContour(canvas.width, canvas.height, scanRegionRef.current),
      true,
    );
  }, [
    updateStatus,
    performCapture,
    cameraSource,
    capturePhonePhotoThenSearch,
    captureDocumentScannerPageThenSearch,
  ]);

  const captureCard = useCallback(() => {
    if (
      isCapturingRef.current ||
      isAtScanLimitRef.current ||
      !SCANNABLE_STATUSES.includes(statusRef.current)
    )
      return;

    isCapturingRef.current = true;

    if (cameraSource === "document-scanner") {
      updateStatus("searching");
      void captureDocumentScannerPageThenSearch(true);
      return;
    }

    updateStatus("settling");

    if (cameraSource === "phone") {
      settleTimeoutRef.current = setTimeout(() => {
        settleTimeoutRef.current = null;
        updateStatus("searching");
        capturePhonePhotoThenSearch(true);
      }, captureSettleDelayMsRef.current);
      return;
    }

    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const contour = getDefaultCardContour(
      canvas.width,
      canvas.height,
      scanRegionRef.current,
    );
    settleTimeoutRef.current = setTimeout(() => {
      settleTimeoutRef.current = null;
      updateStatus("searching");
      performCapture(true, contour, true);
    }, captureSettleDelayMsRef.current);
  }, [
    updateStatus,
    performCapture,
    cameraSource,
    capturePhonePhotoThenSearch,
    captureDocumentScannerPageThenSearch,
  ]);
  captureCardRef.current = captureCard;

  const handleSkipDuplicate = useCallback(() => {
    setDuplicateCard(null);
    updateStatus("scanning");
  }, [updateStatus]);

  const handlePause = useCallback(() => {
    setDuplicateCard(null);
    updateStatus("paused");
  }, [updateStatus]);

  const handleResume = useCallback(() => {
    updateStatus("scanning");
  }, [updateStatus]);

  const handleRetryError = useCallback(async () => {
    setErrorMessage("");
    if (cameraSource === "phone") {
      updateStatus(
        phonePairingStatus === "connected" ? "paused" : "initializing",
      );
      return;
    }
    try {
      await retryCamera();
    } catch {
      handleErrorRef.current(t("scanEngine.cameraReinitFailed"));
    }
  }, [retryCamera, t, cameraSource, phonePairingStatus, updateStatus]);

  return {
    status,
    errorMessage,
    duplicateCard,
    debugImageUrl,
    videoRef,
    displayCanvasRef,
    overlayCanvasRef,
    captureCard,
    handleForceAddDuplicate,
    handleForceScan,
    handleSkipDuplicate,
    handlePause,
    handleResume,
    handleRetryError,
    handleStopCamera: stopCamera,
    isCameraActive:
      cameraSource === "phone"
        ? phonePairingStatus === "connected"
        : cameraStatus === "ready",
    cameras,
    selectedCameraId,
    selectCamera,
    allowDuplicates,
    setAllowDuplicates,
    cameraSource,
    phonePairingStatus,
    phonePairingUrl,
    startPhonePairing,
    stopPhonePairing,
    hasStillPhoto,
    isAtScanLimit,
  };
}
