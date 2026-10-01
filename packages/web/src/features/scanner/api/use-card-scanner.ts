import { billingQueryOptions } from "@/features/billing/api/billing";
import { useDevice } from "@/features/calibration/api/use-device";
import {
  searchByImage,
  searchByText,
  searchByVector,
} from "@/features/cards/api/card";
import { getCardById } from "@/features/cards/api/card-search";
import { useCollections } from "@/features/collections/api/use-collections";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import {
  canvasToBlob,
  drawDetectionOverlay,
  extractCardImage,
  getDefaultCardContour,
} from "@/features/scanner/lib/card-detection";
import { detectAndDewarpCard } from "@/features/scanner/lib/client-vectorize";
import { detectCardCorners } from "@/features/scanner/lib/cornelius";
import { detectColorBar } from "@/features/scanner/lib/color-bar";
import { getOnnxRuntimeFailure } from "@/features/scanner/lib/onnx-runtime";
import { dewarpCard } from "@/features/scanner/lib/perspective-warp";
import {
  embedCanvas,
  rotateCanvas180,
} from "@/features/scanner/lib/milo-client";
import {
  OCR_CROP_HEIGHT,
  OCR_CROP_WIDTH,
  SCANNABLE_STATUSES,
} from "@/lib/constants/scanner";
import type {
  OrientedCandidate,
  OrientedSearch,
  OrientedSearchPick,
  ResolvedSearchMatches,
  ScanAttemptOutcome,
  ScanOutcome,
  TextSearchOutcome,
} from "@/lib/interfaces/scanner";
import { scanLog } from "@/lib/scan-log";
import {
  CLOSE_MATCH_DELTA,
  COLOR_BAR_REGIONS_BY_GAME_KEY,
  type ColorBarRegion,
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_SCAN_REGION,
  OCR_REGIONS_BY_GAME_KEY,
  type CardContour,
  type CardScannerProps,
  type CardSearchResult,
  type OcrDiagnostics,
  type PlayingCardWithDistance,
  type ScanAttemptDiagnostic,
  type ScanDetectionDiagnostics,
  type ScanRegion,
  type ScannerStatus,
  type ScanVectorizeSource,
  type UnmatchedScanDiagnostics,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const LIVE_DETECTION_INTERVAL_MS = 300;
const LIVE_DETECTION_STATUSES: ScannerStatus[] = [
  "scanning",
  "paused",
  "settling",
];
const CONSENSUS_RETRY_BUDGET = 3;

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
  result: CardSearchResult,
  collectionGuid: string | undefined,
): Promise<ResolvedSearchMatches> {
  const data = result.data;
  if (!data || data.length === 0)
    return {
      card: null,
      alternativeMatches: [],
      noMatchReason: result.diagnostics?.reason ?? "too_far",
      candidates: [],
    };

  const candidates = data.map((m) => ({
    cardId: m.cardId,
    name: m.card?.name ?? null,
    distance: m.distance,
    confidence: m.confidence,
  }));

  const closeMatches = data.filter(
    (m) => m.distance - data[0].distance <= CLOSE_MATCH_DELTA,
  );
  const resolved = await Promise.all(
    closeMatches.map(async (m) => {
      const card = m.card ?? (await getCardById(m.cardId, collectionGuid)).data;
      return card
        ? { ...card, distance: m.distance, confidence: m.confidence }
        : null;
    }),
  );

  const cards = resolved.filter(Boolean) as PlayingCardWithDistance[];
  if (cards.length === 0)
    return {
      card: null,
      alternativeMatches: [],
      noMatchReason: "lookup_failed",
      lookupFailedCardIds: closeMatches.map((m) => m.cardId),
      candidates,
    };

  const [card, ...alternativeMatches] = cards;
  return { card, alternativeMatches, noMatchReason: null, candidates };
}

function buildSearchFormData(
  embedding: number[],
  collectionGuid?: string,
  image?: Blob,
): FormData {
  const formData = new FormData();
  if (image) formData.append("image", image, "card.jpg");
  if (collectionGuid) formData.append("collectionGuid", collectionGuid);
  formData.append("embedding", JSON.stringify(embedding));
  return formData;
}

function hasMatch(result: CardSearchResult): boolean {
  return (result.data?.length ?? 0) > 0;
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

  const rotatedWins =
    hasMatch(upright.result) !== hasMatch(rotated.result)
      ? hasMatch(rotated.result)
      : (rotated.result.nearestDistance ?? Number.POSITIVE_INFINITY) <
        (upright.result.nearestDistance ?? Number.POSITIVE_INFINITY);
  return rotatedWins
    ? { ...rotated, alternate: upright }
    : { ...upright, alternate: rotated };
}

function needsTextSearch(result: CardSearchResult): boolean {
  const reason = result.diagnostics?.reason;
  if (reason === "too_far" || reason === "ambiguous") return true;
  const [leader, runnerUp] = result.data ?? [];
  return (
    leader != null &&
    runnerUp != null &&
    runnerUp.distance - leader.distance <= CLOSE_MATCH_DELTA
  );
}

async function searchByCardText(
  frame: HTMLCanvasElement,
  contour: CardContour,
  best: OrientedSearchPick,
  collectionGuid: string | undefined,
): Promise<TextSearchOutcome> {
  const uprightCrop = dewarpCard(
    frame,
    contour,
    OCR_CROP_WIDTH,
    OCR_CROP_HEIGHT,
  );
  let ocr: OcrDiagnostics | null = null;
  for (const option of [best, best.alternate]) {
    if (!option?.embedding) continue;
    const crop =
      option.orientation === "rotated"
        ? rotateCanvas180(uprightCrop)
        : uprightCrop;
    try {
      const result = await searchByText(
        buildSearchFormData(
          option.embedding,
          collectionGuid,
          await canvasToBlob(crop),
        ),
      );
      ocr = result.ocr ?? ocr;
      scanLog(
        `[scanner] OCR (${option.orientation}): name="${result.ocr?.readout.name ?? ""}" setLine="${result.ocr?.readout.setLine ?? ""}" closestName=${result.ocr?.matchedName ? `"${result.ocr.matchedName}" (${(result.ocr.nameScore ?? 0).toFixed(2)})` : "none"} -> ${hasMatch(result) ? `matched ${result.data![0].cardId} at ${result.data![0].distance.toFixed(3)}` : "no match"}`,
      );
      if (hasMatch(result)) {
        return { pick: { ...option, result, alternate: null }, ocr };
      }
    } catch (err) {
      console.error("[scanner] text search failed:", err);
    }
  }
  return { pick: null, ocr };
}

function buildImageSearchFormData(
  blob: Blob,
  collectionGuid?: string,
): FormData {
  const formData = new FormData();
  formData.append("image", blob, "card.jpg");
  if (collectionGuid) formData.append("collectionGuid", collectionGuid);
  return formData;
}

function preferDetectedColor(
  resolved: ResolvedSearchMatches,
  color: string | null,
): ResolvedSearchMatches {
  if (!color || !resolved.card) return resolved;
  const all = [resolved.card, ...resolved.alternativeMatches];
  const preferred = all.find((c) => c.colorIdentity?.includes(color));
  if (!preferred || preferred === resolved.card) return resolved;
  return {
    ...resolved,
    card: preferred,
    alternativeMatches: all.filter((c) => c !== preferred),
  };
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
    | "needsReview"
    | "matchedBy"
  >,
): Promise<ScanAttemptOutcome> {
  const detectedColor = colorBarRegion
    ? detectColorBar(best.canvas, colorBarRegion)
    : null;
  return {
    ...preferDetectedColor(
      await resolveSearchMatches(best.result, collectionGuid),
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
  collectionGuid: string | undefined,
  ocrEnabled: boolean | undefined,
  checkBothOrientations: boolean,
  colorBarRegion: ColorBarRegion | undefined,
): Promise<ScanAttemptOutcome> {
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
    } = await detectAndDewarpCard(
      canvas,
      refreshFrame,
    );
    detection = {
      cardDetected: corners.cardPresent,
      sharpness: corners.sharpness,
      confidence: corners.confidence,
      fallbackReason: null,
    };
    if (dewarpedCanvas) {
      const best = await searchBothOrientations(
        dewarpedCanvas,
        checkBothOrientations,
        async (oriented) => {
          const embedding = await embedCanvas(oriented);
          const result = await searchByVector(
            buildSearchFormData(embedding, collectionGuid),
          );
          return { result, embedding };
        },
      );

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
          ? await searchByCardText(
              frame,
              corners.contour,
              best,
              collectionGuid,
            )
          : null;
      return toAttemptOutcome(text?.pick ?? best, collectionGuid, colorBarRegion, {
        detectedContour: corners.contour,
        vectorizedOn: "web",
        detection,
        ocr: text?.ocr ?? null,
        needsReview: !!text?.pick && !hasMatch(best.result),
        matchedBy: text?.pick ? "ocr" : "embedding",
      });
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
  const best = await searchBothOrientations(
    warpedCanvas,
    checkBothOrientations,
    async (oriented) => {
      const result = await searchByImage(
        buildImageSearchFormData(await canvasToBlob(oriented), collectionGuid),
      );
      return { result, embedding: result.diagnostics?.embedding ?? null };
    },
  );

  return toAttemptOutcome(best, collectionGuid, undefined, {
    detectedContour: null,
    vectorizedOn: "server",
    detection: { ...detection, fallbackReason },
    ocr: null,
    needsReview: false,
    matchedBy: "embedding",
  });
}

function toAttemptDiagnostics(
  attempts: ScanAttemptOutcome[],
): ScanAttemptDiagnostic[] {
  return attempts.map((a) => ({
    reason: a.noMatchReason,
    cardId: a.card?.id ?? null,
    cardName: a.card?.name ?? null,
    distance: a.topDistance,
  }));
}

function toScanOutcome(
  outcome: ScanAttemptOutcome,
  attempts: ScanAttemptOutcome[],
  matchesNeeded: number,
): ScanOutcome {
  const {
    card,
    alternativeMatches,
    debugImageUrl,
    detectedContour,
    vectorizedOn,
    needsReview,
  } = outcome;
  if (card) {
    return {
      card,
      alternativeMatches,
      debugImageUrl,
      detectedContour,
      vectorizedOn,
      matched: {
        needsReview,
        diagnostics: {
          matchedBy: outcome.matchedBy,
          vectorizedOn,
          detection: outcome.detection,
          orientation: outcome.orientation,
          matchesNeeded,
          attempts: toAttemptDiagnostics(attempts),
          candidates: outcome.candidates,
          ocr: outcome.ocr,
          detectedColor: outcome.detectedColor,
        },
      },
      noMatch: null,
    };
  }

  const searchWithoutEmbedding = outcome.search
    ? (({ embedding: _embedding, ...rest }) => rest)(outcome.search)
    : null;
  const diagnostics: UnmatchedScanDiagnostics = {
    reason: attempts.some((a) => a.card)
      ? "no_consensus"
      : (outcome.noMatchReason ?? "too_far"),
    search: searchWithoutEmbedding,
    detection: outcome.detection,
    orientation: outcome.orientation,
    matchesNeeded,
    attempts: toAttemptDiagnostics(attempts),
    lookupFailedCardIds: outcome.lookupFailedCardIds,
    ocr: outcome.ocr,
  };

  return {
    card: null,
    alternativeMatches: [],
    debugImageUrl,
    detectedContour,
    vectorizedOn,
    matched: null,
    noMatch: { diagnostics, embedding: outcome.embedding },
  };
}

async function searchCardImageWithConsensus(
  canvas: HTMLCanvasElement,
  refreshFrame: () => void,
  contour: CardContour | null | undefined,
  collectionGuid: string | undefined,
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
      collectionGuid,
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

  let streakId: string | null = null;
  let streakCount = 0;
  let streakResult: ScanAttemptOutcome | null = null;
  let lastResult: ScanAttemptOutcome | null = null;

  for (let i = 0; i < maxAttempts; i++) {
    const result = await attempt();
    lastResult = result;
    const topId = result.card?.id ?? null;

    if (topId != null && topId === streakId) {
      streakCount++;
      streakResult = result;
    } else {
      streakId = topId;
      streakCount = topId != null ? 1 : 0;
      streakResult = topId != null ? result : null;
    }

    if (streakCount >= matchesNeeded)
      return toScanOutcome(streakResult!, attempts, matchesNeeded);
  }

  return toScanOutcome({ ...lastResult!, card: null }, attempts, matchesNeeded);
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

  const checkBothOrientations =
    device?.checkBothOrientations ?? DEFAULT_CHECK_BOTH_ORIENTATIONS;
  const checkBothOrientationsRef = useRef(checkBothOrientations);
  checkBothOrientationsRef.current = checkBothOrientations;

  const activeCollectionGuidRef = useRef(activeCollection?.guid);
  activeCollectionGuidRef.current = activeCollection?.guid;

  const colorBarRegionRef = useRef<ColorBarRegion | undefined>(undefined);
  colorBarRegionRef.current =
    COLOR_BAR_REGIONS_BY_GAME_KEY[activeCollection?.game?.key ?? ""];

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
    canvas.getContext("2d")?.drawImage(video, 0, 0);
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
            activeCollectionGuidRef.current,
            ocrEnabledRef.current,
            matchesNeededRef.current,
            checkBothOrientationsRef.current,
            colorBarRegionRef.current,
          );
        setDebugImageUrl(debugImageUrl);
        debugImageUrlRef.current = debugImageUrl;
        vectorizedOnRef.current = vectorizedOn;

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
            if (matched?.needsReview) {
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
    [updateStatus, allowDuplicates, drawLatestVideoFrame, t],
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

  // Continuous live-preview overlay showing what would be captured - purely
  // visual feedback, decoupled from when an actual capture/match fires
  // (that stays gated on the settle-delayed captureCard flow).
  const liveDetectingRef = useRef(false);
  useEffect(() => {
    if (!stream) return;

    const intervalId = setInterval(() => {
      if (liveDetectingRef.current || getOnnxRuntimeFailure()) return;
      if (!LIVE_DETECTION_STATUSES.includes(statusRef.current)) return;

      const canvas = displayCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (!canvas || !overlayCanvas || !canvas.width || !canvas.height) return;

      liveDetectingRef.current = true;
      detectCardCorners(canvas)
        .then((detection) => {
          if (!LIVE_DETECTION_STATUSES.includes(statusRef.current)) return;
          const overlayCtx = overlayCanvas.getContext("2d");
          if (!overlayCtx) return;
          overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          if (detection.cardPresent && detection.contour) {
            drawDetectionOverlay(overlayCtx, {
              detected: true,
              contour: detection.contour,
              confidence: detection.confidence,
            });
          }
        })
        .catch((err) => {
          if (!getOnnxRuntimeFailure()) {
            console.error("[scanner] live detection failed:", err);
          }
        })
        .finally(() => {
          liveDetectingRef.current = false;
        });
    }, LIVE_DETECTION_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [stream]);

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
