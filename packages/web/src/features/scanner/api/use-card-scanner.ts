import { billingQueryOptions } from "@/features/billing/api/billing";
import { useDevice } from "@/features/calibration/api/use-device";
import { searchByImage, searchByVector } from "@/features/cards/api/card";
import { getCardById } from "@/features/cards/api/card-search";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import {
  canvasToBlob,
  drawDetectionOverlay,
  extractCardImage,
  getDefaultCardContour,
} from "@/features/scanner/lib/card-detection";
import { vectorizeCardImageOnClient } from "@/features/scanner/lib/client-vectorize";
import { detectCardCorners } from "@/features/scanner/lib/cornelius";
import { getForceCpuVectorize } from "@/features/scanner/lib/force-cpu-vectorize";
import { rotateCanvas180 } from "@/features/scanner/lib/milo-client";
import { CLOSE_MATCH_DELTA, SCANNABLE_STATUSES } from "@/lib/constants/scanner";
import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_SCAN_REGION,
  OCR_REGIONS_BY_GAME_KEY,
  type CardContour,
  type CardScannerProps,
  type PlayingCardWithDistance,
  type Result,
  type ScanRegion,
  type ScannerStatus,
  type SearchCardMatch,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const LIVE_DETECTION_INTERVAL_MS = 200;

// Singleton AudioContext - browsers cap concurrent contexts (~6).
// Creating one per scan exhausts the limit quickly.
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

async function resolveSearchMatches(
  data: SearchCardMatch[] | null | undefined,
  collectionGuid: string | undefined,
  debugImageUrl: string,
): Promise<{
  card: PlayingCardWithDistance | null;
  alternativeMatches: PlayingCardWithDistance[];
  debugImageUrl: string;
}> {
  if (!data || data.length === 0)
    return { card: null, alternativeMatches: [], debugImageUrl };

  const closeMatches = data.filter(
    (m) => m.distance - data[0].distance <= CLOSE_MATCH_DELTA,
  );
  const resolved = await Promise.all(
    closeMatches.map((m) =>
      getCardById(m.cardId, collectionGuid).then((r) =>
        r.data ? { ...r.data, distance: m.distance } : null,
      ),
    ),
  );

  const cards = resolved.filter(Boolean) as PlayingCardWithDistance[];
  if (cards.length === 0)
    return { card: null, alternativeMatches: [], debugImageUrl };

  const [card, ...alternativeMatches] = cards;
  return { card, alternativeMatches, debugImageUrl };
}

function buildSearchFormData(
  blob: Blob,
  embedding: number[],
  collectionGuid?: string,
  ocrEnabled?: boolean,
): FormData {
  const formData = new FormData();
  formData.append("image", blob, "card.jpg");
  if (collectionGuid) formData.append("collectionGuid", collectionGuid);
  formData.append("ocrEnabled", String(ocrEnabled ?? false));
  formData.append("embedding", JSON.stringify(embedding));
  return formData;
}

function bestDistance(result: Result<SearchCardMatch[] | null>): number {
  return result.data?.[0]?.distance ?? Number.POSITIVE_INFINITY;
}

async function searchCardImage(
  canvas: HTMLCanvasElement,
  contour?: CardContour | null,
  collectionGuid?: string,
  ocrEnabled?: boolean,
): Promise<{
  card: PlayingCardWithDistance | null;
  alternativeMatches: PlayingCardWithDistance[];
  debugImageUrl: string;
}> {
  if (!getForceCpuVectorize()) {
    try {
      const { dewarpedCanvas, embeddings } = await vectorizeCardImageOnClient(canvas);
      if (dewarpedCanvas && embeddings) {
        // Corner geometry alone can't tell top from bottom (a rectangle looks
        // the same rotated 180°) - Cornelius only resolves the portrait/
        // landscape axis, so the dewarped crop is upright exactly half the
        // time. Milo is sensitive to that remaining ambiguity, which is why
        // both orientations get searched; each needs its own correctly-
        // rotated image (not just its own embedding), both for the debug/
        // captured-image preview and so server-side OCR reads the right way up.
        const rotatedCanvas = rotateCanvas180(dewarpedCanvas);
        const [uprightBlob, rotatedBlob] = await Promise.all([
          canvasToBlob(dewarpedCanvas),
          canvasToBlob(rotatedCanvas),
        ]);

        const [uprightResult, rotatedResult] = await Promise.all([
          searchByVector(
            buildSearchFormData(uprightBlob, embeddings.upright, collectionGuid, ocrEnabled),
          ),
          searchByVector(
            buildSearchFormData(rotatedBlob, embeddings.rotated, collectionGuid, ocrEnabled),
          ),
        ]);
        const rotatedWon = bestDistance(rotatedResult) < bestDistance(uprightResult);
        const best = rotatedWon ? rotatedResult : uprightResult;
        const debugImageUrl = (rotatedWon ? rotatedCanvas : dewarpedCanvas).toDataURL(
          "image/jpeg",
          0.8,
        );

        return resolveSearchMatches(best.data, collectionGuid, debugImageUrl);
      }
      // Cornelius didn't confidently find a card in frame - fall through to
      // the server path below rather than guessing with the static crop.
    } catch (err) {
      console.error("[scanner] client-side vectorization failed, falling back to server:", err);
    }
  }

  const warpedCanvas = contour ? extractCardImage(canvas, contour) : canvas;
  const debugImageUrl = warpedCanvas.toDataURL("image/jpeg", 0.8);
  const blob = await canvasToBlob(warpedCanvas);

  const formData = new FormData();
  formData.append("image", blob, "card.jpg");
  if (collectionGuid) formData.append("collectionGuid", collectionGuid);
  formData.append("ocrEnabled", String(ocrEnabled ?? false));

  const { data } = await searchByImage(formData);
  return resolveSearchMatches(data, collectionGuid, debugImageUrl);
}

// Re-runs the capture exactly matchesNeeded times (each attempt itself
// checking both the upright and 180°-rotated embedding, per searchCardImage)
// and requires every one of them to agree on the same top card before
// accepting it - no early exit on a mismatch and no extra attempts beyond
// matchesNeeded, so the number a user sets is exactly how many rounds run,
// every time. `canvas` is re-read live by each attempt's own vision
// pipeline, not snapshotted once, since it's the same element the RAF draw
// loop keeps redrawing the current camera frame onto.
async function searchCardImageWithConsensus(
  canvas: HTMLCanvasElement,
  contour: CardContour | null | undefined,
  collectionGuid: string | undefined,
  ocrEnabled: boolean | undefined,
  matchesNeeded: number,
): Promise<{
  card: PlayingCardWithDistance | null;
  alternativeMatches: PlayingCardWithDistance[];
  debugImageUrl: string;
}> {
  if (matchesNeeded <= 1) {
    return searchCardImage(canvas, contour, collectionGuid, ocrEnabled);
  }

  let streakId: string | null = null;
  let streakCount = 0;
  let lastResult: Awaited<ReturnType<typeof searchCardImage>> | null = null;

  for (let attempt = 0; attempt < matchesNeeded; attempt++) {
    const result = await searchCardImage(canvas, contour, collectionGuid, ocrEnabled);
    lastResult = result;
    const topId = result.card?.id ?? null;

    if (topId != null && topId === streakId) {
      streakCount++;
    } else {
      streakId = topId;
      streakCount = topId != null ? 1 : 0;
    }
  }

  return streakId != null && streakCount >= matchesNeeded ? lastResult! : { ...lastResult!, card: null };
}

export function useCardScanner({
  onSearchResults,
  onNoMatch,
  onError,
  rotated = true,
  scanRegion: scanRegionProp,
}: Omit<CardScannerProps, "className"> & {
  rotated?: boolean;
  scanRegion?: ScanRegion;
} = {}) {
  const { t } = useTranslation("scanner");
  const {
    stream,
    status: cameraStatus,
    errorMessage: cameraError,
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
  } = useCameraContext();
  const { activeCollection } = useCollections();
  const { activeOrg } = useOrg();
  const device = useDevice();
  const { data: billingData } = useQuery(billingQueryOptions(activeOrg?.id));

  const isAtScanLimit =
    billingData?.plan === "free" &&
    billingData?.dailyLimit != null &&
    billingData.cardsScannedToday >= billingData.dailyLimit;
  const isAtScanLimitRef = useRef(isAtScanLimit);
  isAtScanLimitRef.current = isAtScanLimit;

  const rotatedRef = useRef(rotated);
  rotatedRef.current = rotated;

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

  const activeCollectionGuidRef = useRef(activeCollection?.guid);
  activeCollectionGuidRef.current = activeCollection?.guid;

  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const statusRef = useRef<ScannerStatus>("initializing");
  const lastScannedCardIdRef = useRef<string | null>(null);
  const isCapturingRef = useRef(false);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchResultsRef = useRef(onSearchResults);
  const onNoMatchRef = useRef(onNoMatch);
  const handleErrorRef = useRef<(msg: string) => void>(() => {});

  const [status, setStatus] = useState<ScannerStatus>("initializing");
  const [errorMessage, setErrorMessage] = useState("");
  const [duplicateCard, setDuplicateCard] =
    useState<PlayingCardWithDistance | null>(null);
  const [debugImageUrl, setDebugImageUrl] = useState<string | null>(null);
  const debugImageUrlRef = useRef<string | null>(null);
  const [allowDuplicates, setAllowDuplicates] = useState(true);
  // Games without a tuned OCR region (see OCR_REGIONS_BY_GAME_KEY) can't
  // usefully run OCR at all - keep the toggle off and disabled for them
  // rather than letting it silently do nothing.
  const ocrSupported =
    (OCR_REGIONS_BY_GAME_KEY[activeCollection?.game?.key ?? ""]?.length ?? 0) >
    0;
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const ocrEnabledRef = useRef(ocrEnabled && ocrSupported);
  ocrEnabledRef.current = ocrEnabled && ocrSupported;
  const [hasPhonePhoto, setHasPhonePhoto] = useState(false);

  useEffect(() => {
    if (cameraSource !== "phone") setHasPhonePhoto(false);
  }, [cameraSource]);

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
    handleErrorRef.current = handleError;
  }, [handleError]);

  useEffect(() => {
    if (cameraSource === "phone") return; // handled by the phone-status effect below
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

  const performCapture = useCallback(
    async (checkDuplicate: boolean, contour?: CardContour | null) => {
      const canvas = displayCanvasRef.current;
      if (!canvas) {
        isCapturingRef.current = false;
        updateStatus("scanning");
        return;
      }

      try {
        const { card, alternativeMatches, debugImageUrl } =
          await searchCardImageWithConsensus(
            canvas,
            contour,
            activeCollectionGuidRef.current,
            ocrEnabledRef.current,
            matchesNeededRef.current,
          );
        setDebugImageUrl(debugImageUrl);
        debugImageUrlRef.current = debugImageUrl;

        if (card) {
          if (
            checkDuplicate &&
            !allowDuplicates &&
            lastScannedCardIdRef.current === card.id
          ) {
            setDuplicateCard(card);
            updateStatus("duplicate");
          } else {
            lastScannedCardIdRef.current = card.id;
            onSearchResultsRef.current?.(
              [card, ...alternativeMatches],
              debugImageUrl,
            );
            updateStatus("scanning");
          }
        } else {
          playDingSound();
          onNoMatchRef.current?.(debugImageUrl);
          updateStatus("no-match");
        }
      } catch (err) {
        handleErrorRef.current(
          err instanceof Error ? err.message : t("scanEngine.searchFailed"),
        );
      } finally {
        isCapturingRef.current = false;
      }
    },
    [updateStatus, allowDuplicates, t],
  );

  const detectionLoop = useCallback(() => {
    const video = videoRef.current;
    const displayCanvas = displayCanvasRef.current;

    if (!video || !displayCanvas) return;
    if (video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(detectionLoop);
      return;
    }

    const displayCtx = displayCanvas.getContext("2d");
    if (!displayCtx) return;

    displayCtx.drawImage(video, 0, 0);

    rafRef.current = requestAnimationFrame(detectionLoop);
  }, []);

  // Attach stream to video/canvases and start the detection loop.
  // Re-runs if the stream is replaced (e.g. after retryCamera).
  // On unmount: cancels the RAF loop but does NOT stop the stream tracks -
  // the CameraProvider owns the stream lifetime.
  useEffect(() => {
    if (!stream) return;

    let cancelled = false;
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

        const container = displayCanvasRef.current?.parentElement;
        if (container) {
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const scale = rotatedRef.current
            ? Math.max(cw / videoHeight, ch / videoWidth)
            : Math.max(cw / videoWidth, ch / videoHeight);
          const cssW = Math.round(videoWidth * scale);
          const cssH = Math.round(videoHeight * scale);
          for (const ref of [displayCanvasRef, overlayCanvasRef]) {
            if (ref.current) {
              ref.current.style.width = `${cssW}px`;
              ref.current.style.height = `${cssH}px`;
              ref.current.style.left = `${(cw - cssW) / 2}px`;
              ref.current.style.top = `${(ch - cssH) / 2}px`;
            }
          }
        }

        updateStatus("paused");
        rafRef.current = requestAnimationFrame(detectionLoop);
      } catch (err) {
        if (!cancelled) {
          handleErrorRef.current(
            err instanceof Error
              ? err.message
              : t("scanEngine.videoStartFailed"),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
        isCapturingRef.current = false;
      }
      video.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  // Polls Cornelius on the live feed so the on-screen guide reflects the
  // actual detected card quadrilateral instead of a fixed alignment box.
  // Runs on the whole frame every time (see cornelius.ts) - no ROI crop.
  // Independent of the RAF draw loop above since inference is far too slow
  // to run every frame. Nothing is drawn when no card is confidently
  // detected, rather than falling back to a static shape.
  const liveDetectingRef = useRef(false);
  useEffect(() => {
    if (!stream || cameraSource === "phone") return;

    const interval = setInterval(() => {
      if (liveDetectingRef.current || isCapturingRef.current) return;
      if (statusRef.current !== "scanning" && statusRef.current !== "paused") return;

      const canvas = displayCanvasRef.current;
      const overlayCtx = overlayCanvasRef.current?.getContext("2d");
      if (!canvas || !overlayCtx || !canvas.width || !canvas.height) return;

      liveDetectingRef.current = true;
      detectCardCorners(canvas)
        .then((detection) => {
          overlayCtx.clearRect(0, 0, canvas.width, canvas.height);
          if (detection.cardPresent) {
            drawDetectionOverlay(overlayCtx, {
              detected: true,
              contour: detection.contour,
              confidence: detection.confidence,
              sharpness: detection.sharpness ?? undefined,
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          liveDetectingRef.current = false;
        });
    }, LIVE_DETECTION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [stream, cameraSource]);

  const handleForceAddDuplicate = useCallback(() => {
    if (duplicateCard) {
      onSearchResultsRef.current?.(
        [duplicateCard],
        debugImageUrlRef.current ?? undefined,
      );
      setDuplicateCard(null);
      updateStatus("scanning");
    }
  }, [duplicateCard, updateStatus]);

  const drawImageToCanvas = useCallback(
    (dataUrl: string): Promise<CardContour | null> => {
      return new Promise((resolve) => {
        const canvas = displayCanvasRef.current;
        if (!canvas) {
          resolve(null);
          return;
        }
        const img = new Image();
        img.onload = () => {
          const overlayCanvas = overlayCanvasRef.current;

          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          if (overlayCanvas) {
            overlayCanvas.width = img.naturalWidth;
            overlayCanvas.height = img.naturalHeight;
          }

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          setHasPhonePhoto(true);

          const contour = getDefaultCardContour(
            canvas.width,
            canvas.height,
            scanRegionRef.current,
          );

          const overlayCtx = overlayCanvas?.getContext("2d");
          if (overlayCanvas && overlayCtx) {
            overlayCtx.clearRect(
              0,
              0,
              overlayCanvas.width,
              overlayCanvas.height,
            );
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

          resolve(contour);
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
    },
    [],
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
        performCapture(checkDuplicate, contour);
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

    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    performCapture(
      false,
      getDefaultCardContour(canvas.width, canvas.height, scanRegionRef.current),
    );
  }, [updateStatus, performCapture, cameraSource, capturePhonePhotoThenSearch]);

  const captureCard = useCallback(() => {
    if (
      isCapturingRef.current ||
      isAtScanLimitRef.current ||
      !SCANNABLE_STATUSES.includes(statusRef.current)
    )
      return;

    isCapturingRef.current = true;
    updateStatus("searching");

    if (cameraSource === "phone") {
      settleTimeoutRef.current = setTimeout(() => {
        settleTimeoutRef.current = null;
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
      performCapture(true, contour);
    }, captureSettleDelayMsRef.current);
  }, [updateStatus, performCapture, cameraSource, capturePhonePhotoThenSearch]);

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
      // Don't fall back to the local webcam here - just clear the error and
      // let the phone-status effect above re-evaluate current presence.
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
    zoom,
    zoomRange,
    cameras,
    selectedCameraId,
    setZoom,
    selectCamera,
    allowDuplicates,
    setAllowDuplicates,
    ocrEnabled: ocrEnabled && ocrSupported,
    setOcrEnabled,
    ocrSupported,
    cameraSource,
    phonePairingStatus,
    phonePairingUrl,
    startPhonePairing,
    stopPhonePairing,
    hasPhonePhoto,
    isAtScanLimit,
  };
}
