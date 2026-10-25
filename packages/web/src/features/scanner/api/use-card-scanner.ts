import { billingQueryOptions } from "@/features/billing/api/billing";
import { useDevice } from "@/features/calibration/api/use-device";
import {
  searchByImage,
  searchByText,
  searchByVector,
} from "@/features/cards/api/card";
import { getCardById } from "@/features/cards/api/card-search";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import {
  canvasToBlob,
  drawDetectionOverlay,
  extractCardImage,
} from "@/features/scanner/lib/card-detection";
import { detectAndDewarpCard } from "@/features/scanner/lib/client-vectorize";
import { detectCardCorners } from "@/features/scanner/lib/cornelius";
import { detectColorBar } from "@/features/scanner/lib/color-bar";
import { getOnnxRuntimeFailure } from "@/features/scanner/lib/onnx-runtime";
import { createOutlineAnimator } from "@/features/scanner/lib/outline-animator";
import {
  contourFingerprint,
  fingerprintDistance,
} from "@/features/scanner/lib/hand-scan";
import { dewarpCard } from "@/features/scanner/lib/perspective-warp";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import {
  embedCanvas,
  rotateCanvas180,
} from "@/features/scanner/lib/milo-client";
import {
  HAND_SCAN_REARM_FINGERPRINT_DIFF,
  HAND_SCAN_TRACKING_STATUSES,
  SCANNABLE_STATUSES,
  SCANNER_LIVE_DETECTION_INTERVAL_MS,
  LIVE_DETECTION_STATUSES,
} from "@/lib/constants/scanner";
import type {
  MatchScope,
  OrientedCandidate,
  OrientedSearch,
  OrientedSearchPick,
  ScanAttemptOutcome,
  ScanOutcome,
  TextSearchOutcome,
} from "@/lib/interfaces/scanner";
import {
  drawVideoFrame,
  fitCanvasesToContainer,
  observeContainerResize,
} from "@/features/scanner/lib/canvas-fit";
import { scanLog } from "@/lib/scan-log";
import {
  COLOR_BAR_REGIONS_BY_GAME_KEY,
  CONSENSUS_RETRY_BUDGET,
  hasCardMatch,
  needsTextSearch,
  OCR_CROP_HEIGHT,
  OCR_CROP_WIDTH,
  type ColorBarRegion,
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
  isStrongerTextMatch,
  pickBetterOrientation,
  pickConsensus,
  type PlayingCardWithDistance,
  preferDetectedColor,
  resolveCardSearchMatches,
  type ScanDetectionDiagnostics,
  type ScanRegion,
  type ScannerStatus,
  type ScanVectorizeSource,
  toScanMatchDetails,
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

function appendMatchScope(formData: FormData, scope: MatchScope): void {
  if (scope.collectionGuid)
    formData.append("collectionGuid", scope.collectionGuid);
  if (scope.preferredSetCode)
    formData.append("preferredSetCode", scope.preferredSetCode);
}

function buildSearchFormData(
  embedding: number[],
  scope: MatchScope,
  image?: Blob,
): FormData {
  const formData = new FormData();
  if (image) formData.append("image", image, "card.jpg");
  appendMatchScope(formData, scope);
  formData.append("embedding", JSON.stringify(embedding));
  return formData;
}

async function searchBothOrientations(
  canvas: HTMLCanvasElement,
  checkBothOrientations: boolean,
  search: (canvas: HTMLCanvasElement) => Promise<OrientedSearch>,
): Promise<OrientedSearchPick> {
  if (!checkBothOrientations)
    return {
      ...(await search(canvas)),
      canvas,
      orientation: "upright",
      alternate: null,
    };

  const rotatedCanvas = rotateCanvas180(canvas);
  const [upright, rotated] = await Promise.all([
    search(canvas).then(
      (found): OrientedCandidate => ({
        ...found,
        canvas,
        orientation: "upright",
      }),
    ),
    search(rotatedCanvas).then(
      (found): OrientedCandidate => ({
        ...found,
        canvas: rotatedCanvas,
        orientation: "rotated",
      }),
    ),
  ]);

  return pickBetterOrientation(upright, rotated);
}

async function searchByCardText(
  frame: HTMLCanvasElement,
  contour: CardContour,
  best: OrientedSearchPick,
  scope: MatchScope,
): Promise<TextSearchOutcome> {
  const uprightCrop = dewarpCard(
    frame,
    contour,
    OCR_CROP_WIDTH,
    OCR_CROP_HEIGHT,
  );
  const crops = [uprightCrop];
  try {
    const options = [best, best.alternate].filter(
      (option): option is OrientedCandidate & { embedding: number[] } =>
        !!option?.embedding,
    );
    const results = await Promise.all(
      options.map(async (option) => {
        const crop =
          option.orientation === "rotated"
            ? rotateCanvas180(uprightCrop)
            : uprightCrop;
        crops.push(crop);
        try {
          const result = await searchByText(
            buildSearchFormData(
              option.embedding,
              scope,
              await canvasToBlob(crop),
            ),
          );
          scanLog(
            `[scanner] OCR (${option.orientation}): name="${result.ocr?.readout.name ?? ""}" setLine="${result.ocr?.readout.setLine ?? ""}" number="${result.ocr?.readout.number ?? ""}" closestName=${result.ocr?.matchedName ? `"${result.ocr.matchedName}" (${(result.ocr.nameScore ?? 0).toFixed(2)})` : "none"} -> ${hasCardMatch(result) ? `matched ${result.data![0].cardId} at ${result.data![0].distance.toFixed(3)}` : "no match"}`,
          );
          return result;
        } catch (err) {
          console.error("[scanner] text search failed:", err);
          return null;
        }
      }),
    );
    let bestIndex = 0;
    results.forEach((result, index) => {
      if (isStrongerTextMatch(result, results[bestIndex])) bestIndex = index;
    });
    const result = results[bestIndex];
    const ocr = result?.ocr ?? results.find((r) => r?.ocr)?.ocr ?? null;
    if (!result || !hasCardMatch(result)) return { pick: null, ocr };
    return {
      pick: { ...options[bestIndex], result, alternate: null },
      ocr,
    };
  } finally {
    releaseCanvases(crops);
  }
}

function buildImageSearchFormData(blob: Blob, scope: MatchScope): FormData {
  const formData = new FormData();
  formData.append("image", blob, "card.jpg");
  appendMatchScope(formData, scope);
  return formData;
}

async function toAttemptOutcome(
  best: OrientedSearchPick,
  collectionGuid: string | undefined,
  colorBarRegion: ColorBarRegion | undefined,
  context: Pick<
    ScanAttemptOutcome,
    | "detectedContour"
    | "vectorizedOn"
    | "detection"
    | "ocr"
    | "lowConfidenceMatch"
    | "matchedBy"
  >,
): Promise<ScanAttemptOutcome> {
  const detectedColor = colorBarRegion
    ? detectColorBar(best.canvas, colorBarRegion)
    : null;
  return {
    ...preferDetectedColor(
      await resolveCardSearchMatches(
        best.result,
        async (match) =>
          (await getCardById(match.cardId, collectionGuid, match.lang)).data,
      ),
      detectedColor,
    ),
    ...context,
    detectedColor,
    debugImageUrl: best.canvas.toDataURL("image/jpeg", 0.8),
    search: best.result.diagnostics ?? null,
    orientation: best.orientation,
    embedding: best.embedding,
    topDistance:
      best.result.data?.[0]?.distance ?? best.result.nearestDistance ?? null,
  };
}

async function searchCardImage(
  canvas: HTMLCanvasElement,
  refreshFrame: () => void,
  contour: CardContour | null | undefined,
  scope: MatchScope,
  ocrEnabled: boolean | undefined,
  checkBothOrientations: boolean,
  colorBarRegion: ColorBarRegion | undefined,
): Promise<ScanAttemptOutcome> {
  const created: HTMLCanvasElement[] = [];
  try {
    return await runCardImageSearch(
      created,
      canvas,
      refreshFrame,
      contour,
      scope,
      ocrEnabled,
      checkBothOrientations,
      colorBarRegion,
    );
  } finally {
    releaseCanvases(created, [canvas]);
  }
}

async function runCardImageSearch(
  created: HTMLCanvasElement[],
  canvas: HTMLCanvasElement,
  refreshFrame: () => void,
  contour: CardContour | null | undefined,
  scope: MatchScope,
  ocrEnabled: boolean | undefined,
  checkBothOrientations: boolean,
  colorBarRegion: ColorBarRegion | undefined,
): Promise<ScanAttemptOutcome> {
  const { collectionGuid } = scope;
  let fallbackReason = "card not detected";
  let detection: ScanDetectionDiagnostics = {
    cardDetected: false,
    sharpness: null,
    confidence: null,
    fallbackReason: null,
  };
  try {
    const {
      dewarpedCanvas,
      detection: corners,
      frame,
    } = await detectAndDewarpCard(canvas, refreshFrame);
    detection = {
      cardDetected: corners.cardPresent,
      sharpness: corners.sharpness,
      confidence: corners.confidence,
      fallbackReason: null,
    };
    if (dewarpedCanvas) {
      created.push(dewarpedCanvas);
      const best = await searchBothOrientations(
        dewarpedCanvas,
        checkBothOrientations,
        async (oriented) => {
          const embedding = await embedCanvas(oriented);
          const result = await searchByVector(
            buildSearchFormData(embedding, scope),
          );
          return { result, embedding };
        },
      );
      created.push(best.canvas);
      if (best.alternate) created.push(best.alternate.canvas);

      scanLog(
        `[scanner] using AI card detection (confidence=${corners.confidence.toFixed(3)})`,
      );
      const runOcr =
        !!ocrEnabled && !!corners.contour && needsTextSearch(best.result);
      if (ocrEnabled) {
        scanLog(
          runOcr
            ? `[scanner] OCR running (embedding unsure: ${best.result.diagnostics?.reason ?? "close alternatives"})`
            : "[scanner] OCR skipped (confident embedding match)",
        );
      }
      const text =
        runOcr && corners.contour
          ? await searchByCardText(frame, corners.contour, best, scope)
          : null;
      return toAttemptOutcome(
        text?.pick ?? best,
        collectionGuid,
        colorBarRegion,
        {
          detectedContour: corners.contour,
          vectorizedOn: "web",
          detection,
          ocr: text?.ocr ?? null,
          lowConfidenceMatch: !!text?.pick && !hasCardMatch(best.result),
          matchedBy: text?.pick ? "ocr" : "embedding",
        },
      );
    }
    fallbackReason = `card not detected (cardPresent=${corners.cardPresent}, sharpness=${corners.sharpness ?? "n/a"})`;
  } catch (err) {
    fallbackReason = `client-side vectorization threw: ${err instanceof Error ? err.message : String(err)}`;
    console.error(
      "[scanner] client-side vectorization failed, falling back to server:",
      err,
    );
  }

  scanLog(`[scanner] using fallback scan region (${fallbackReason})`);
  const warpedCanvas = contour ? extractCardImage(canvas, contour) : canvas;
  created.push(warpedCanvas);
  const best = await searchBothOrientations(
    warpedCanvas,
    checkBothOrientations,
    async (oriented) => {
      const result = await searchByImage(
        buildImageSearchFormData(await canvasToBlob(oriented), scope),
      );
      return { result, embedding: result.diagnostics?.embedding ?? null };
    },
  );
  created.push(best.canvas);
  if (best.alternate) created.push(best.alternate.canvas);

  return toAttemptOutcome(best, collectionGuid, undefined, {
    detectedContour: null,
    vectorizedOn: "server",
    detection: { ...detection, fallbackReason },
    ocr: null,
    lowConfidenceMatch: false,
    matchedBy: "embedding",
  });
}

function toScanOutcome(
  outcome: ScanAttemptOutcome,
  attempts: ScanAttemptOutcome[],
  matchesNeeded: number,
): ScanOutcome {
  const { card, debugImageUrl, detectedContour, vectorizedOn } = outcome;
  return {
    card,
    alternativeMatches: card ? outcome.alternativeMatches : [],
    debugImageUrl,
    detectedContour,
    vectorizedOn,
    ...toScanMatchDetails(outcome, attempts, matchesNeeded, vectorizedOn),
  };
}

async function searchCardImageWithConsensus(
  canvas: HTMLCanvasElement,
  refreshFrame: () => void,
  contour: CardContour | null | undefined,
  scope: MatchScope,
  ocrEnabled: boolean | undefined,
  matchesNeeded: number,
  checkBothOrientations: boolean,
  colorBarRegion: ColorBarRegion | undefined,
): Promise<ScanOutcome> {
  const attempts: ScanAttemptOutcome[] = [];
  const attempt = async () => {
    const outcome = await searchCardImage(
      canvas,
      refreshFrame,
      contour,
      scope,
      ocrEnabled,
      checkBothOrientations,
      colorBarRegion,
    );
    attempts.push(outcome);
    return outcome;
  };

  if (matchesNeeded <= 1)
    return toScanOutcome(await attempt(), attempts, matchesNeeded);

  const maxAttempts = matchesNeeded + CONSENSUS_RETRY_BUDGET;

  let lastResult: ScanAttemptOutcome | null = null;

  for (let i = 0; i < maxAttempts; i++) {
    lastResult = await attempt();
    const agreed = pickConsensus(attempts, matchesNeeded);
    if (agreed) return toScanOutcome(agreed, attempts, matchesNeeded);
  }

  return toScanOutcome({ ...lastResult!, card: null }, attempts, matchesNeeded);
}

export function useCardScanner({
  onSearchResults,
  onNoMatch,
  onError,
  rotated = true,
  scanRegion: scanRegionProp,
  autoCapture = false,
}: Omit<CardScannerProps, "className"> & {
  rotated?: boolean;
  scanRegion?: ScanRegion;
  autoCapture?: boolean;
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
  } = useCameraContext();
  const { activeCollection } = useCollections();
  const { forceSetCode: preferredSetCode } = useScannedCards();
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

  const autoCaptureRef = useRef(autoCapture);
  autoCaptureRef.current = autoCapture;
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
  const preferredSetCodeRef = useRef(preferredSetCode);
  preferredSetCodeRef.current = preferredSetCode;

  const colorBarRegionRef = useRef<ColorBarRegion | undefined>(undefined);
  colorBarRegionRef.current =
    COLOR_BAR_REGIONS_BY_GAME_KEY[activeCollection?.game?.key ?? ""];

  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [outlineAnimator] = useState(() =>
    createOutlineAnimator(() => overlayCanvasRef.current),
  );
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
  const vectorizedOnRef = useRef<ScanVectorizeSource | undefined>(undefined);
  const [allowDuplicates, setAllowDuplicates] = useState(true);
  const { data: orgSettings } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );
  const ocrSupported =
    (OCR_REGIONS_BY_GAME_KEY[activeCollection?.game?.key ?? ""]?.length ?? 0) >
    0;
  const ocrEnabledRef = useRef(false);
  ocrEnabledRef.current = !!orgSettings?.ocrEnabled && ocrSupported;
  const [hasPhonePhoto, setHasPhonePhoto] = useState(false);

  useEffect(() => {
    if (cameraSource !== "phone") setHasPhonePhoto(false);
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
    ) => {
      const canvas = displayCanvasRef.current;
      if (!canvas) {
        isCapturingRef.current = false;
        updateStatus("scanning");
        return;
      }

      try {
        const {
          card,
          alternativeMatches,
          debugImageUrl,
          detectedContour,
          vectorizedOn,
          matched,
          noMatch,
        } = await searchCardImageWithConsensus(
          canvas,
          fromLiveVideo ? drawLatestVideoFrame : () => {},
          contour,
          {
            collectionGuid: activeCollectionGuidRef.current,
            preferredSetCode: preferredSetCodeRef.current,
          },
          ocrEnabledRef.current,
          matchesNeededRef.current,
          checkBothOrientationsRef.current,
          colorBarRegionRef.current,
        );
        setDebugImageUrl(debugImageUrl);
        debugImageUrlRef.current = debugImageUrl;
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
            onSearchResultsRef.current?.(
              [card, ...alternativeMatches],
              debugImageUrl,
              vectorizedOn,
              matched ?? undefined,
            );
            if (!pausedMidSearch) updateStatus("scanning");
          }
        } else {
          playDingSound();
          onNoMatchRef.current?.(
            debugImageUrl,
            vectorizedOn,
            noMatch ?? undefined,
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
    [
      updateStatus,
      allowDuplicates,
      drawLatestVideoFrame,
      outlineAnimator,
      t,
    ],
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

    drawVideoFrame(displayCtx, video, flipCameraRef.current);

    rafRef.current = requestAnimationFrame(detectionLoop);
  }, []);

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
        rafRef.current = requestAnimationFrame(detectionLoop);
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
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
        isCapturingRef.current = false;
      }
      video.srcObject = null;
    };
  }, [stream, updateStatus, detectionLoop, outlineAnimator]);

  const liveDetectingRef = useRef(false);
  useEffect(() => {
    if (!stream) return;

    const intervalId = setInterval(() => {
      if (liveDetectingRef.current || getOnnxRuntimeFailure()) return;
      if (!isTrackedStatus()) return;

      const canvas = displayCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (!canvas || !overlayCanvas || !canvas.width || !canvas.height) return;

      liveDetectingRef.current = true;
      detectCardCorners(canvas)
        .then((detection) => {
          if (!isTrackedStatus()) return;
          if (autoCaptureRef.current) trackHandScan(detection, canvas);
          if (!LIVE_DETECTION_STATUSES.includes(statusRef.current)) return;
          outlineAnimator.setTarget(
            detection.cardPresent ? detection.contour : null,
          );
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
  }, [stream, outlineAnimator]);

  const handleForceAddDuplicate = useCallback(() => {
    if (duplicateCard) {
      onSearchResultsRef.current?.(
        [duplicateCard],
        debugImageUrlRef.current ?? undefined,
        vectorizedOnRef.current,
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

          outlineAnimator.cancel();
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
    [outlineAnimator],
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

    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    performCapture(
      false,
      getDefaultCardContour(canvas.width, canvas.height, scanRegionRef.current),
      true,
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
  }, [updateStatus, performCapture, cameraSource, capturePhonePhotoThenSearch]);
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
    hasPhonePhoto,
    isAtScanLimit,
  };
}
