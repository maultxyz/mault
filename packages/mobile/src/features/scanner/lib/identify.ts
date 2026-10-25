import {
  CARD_DETECTION_RETRY_INTERVAL_MS,
  CARD_DETECTION_RETRY_TIMEOUT_MS,
  COLOR_BAR_REGIONS_BY_GAME_KEY,
  CONSENSUS_RETRY_BUDGET,
  DEWARP_OUTPUT_SIZE,
  hasCardMatch,
  needsTextSearch,
  OCR_CROP_HEIGHT,
  OCR_CROP_WIDTH,
  detectColorBarRgba,
  dewarpRgba,
  getDefaultCardContour,
  isStrongerTextMatch,
  pickBetterOrientation,
  pickConsensus,
  preferDetectedColor,
  resolveCardSearchMatches,
  rotateRgba180,
  type CardContour,
  type CornerDetection,
  type ScanDetectionDiagnostics,
  type ScanRegion,
  toScanMatchDetails,
} from "@magic-vault/shared";
import { getCardById, searchByText, searchByVector } from "@/features/scanner/api/card-search";
import {
  CAPTURED_IMAGE_JPEG_QUALITY,
  OCR_IMAGE_JPEG_QUALITY,
} from "@/lib/constants/scanner";
import type {
  CapturedFrame,
  IdentifyOptions,
  IdentifyOutcome,
  MatchScope,
  OrientedPick,
  ScanAttempt,
} from "@/lib/interfaces/scanner";
import { encodeJpegDataUrl, writeJpegTempFile } from "./frame";
import { detectCorners, embedCard } from "./inference";
import { delay } from "@/lib/delay";

async function detectWithRetry(
  capture: () => Promise<CapturedFrame>,
  minSharpness: number | undefined,
): Promise<{ frame: CapturedFrame; detection: CornerDetection }> {
  const start = Date.now();
  let frame = await capture();
  let detection = await detectCorners(frame, minSharpness);
  while (!detection.cardPresent && Date.now() - start < CARD_DETECTION_RETRY_TIMEOUT_MS) {
    await delay(CARD_DETECTION_RETRY_INTERVAL_MS);
    frame = await capture();
    detection = await detectCorners(frame, minSharpness);
  }
  return { frame, detection };
}

async function searchOriented(
  pixels: CapturedFrame["pixels"],
  scope: MatchScope,
  checkBothOrientations: boolean,
): Promise<OrientedPick> {
  const search = async (oriented: CapturedFrame["pixels"], orientation: OrientedPick["orientation"]) => {
    const embedding = await embedCard(oriented);
    const result = await searchByVector(embedding, scope);
    return { pixels: oriented, orientation, embedding, result, alternate: null } satisfies OrientedPick;
  };
  if (!checkBothOrientations) return search(pixels, "upright");

  const [upright, rotated] = await Promise.all([
    search(pixels, "upright"),
    search(rotateRgba180(pixels), "rotated"),
  ]);
  return pickBetterOrientation(upright, rotated);
}

async function searchByCardText(
  frame: CapturedFrame,
  contour: CardContour,
  best: OrientedPick,
  scope: MatchScope,
): Promise<{ pick: OrientedPick | null; ocr: ScanAttempt["ocr"] }> {
  const upright = dewarpRgba(frame.pixels, contour, OCR_CROP_WIDTH, OCR_CROP_HEIGHT);
  const options = [best, best.alternate].filter((option): option is OrientedPick => !!option);
  const results = await Promise.all(
    options.map(async (option) => {
      const crop = option.orientation === "rotated" ? rotateRgba180(upright) : upright;
      try {
        const uri = await writeJpegTempFile(crop, OCR_IMAGE_JPEG_QUALITY);
        return await searchByText(option.embedding, scope, uri);
      } catch {
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
  return { pick: { ...options[bestIndex], result, alternate: null }, ocr };
}

async function attemptOnce(
  capture: () => Promise<CapturedFrame>,
  options: IdentifyOptions,
  scanRegion: ScanRegion,
): Promise<ScanAttempt> {
  const { frame, detection: corners } = await detectWithRetry(capture, options.minSharpness);
  const detection: ScanDetectionDiagnostics = {
    cardDetected: corners.cardPresent,
    sharpness: corners.sharpness,
    confidence: corners.confidence,
    fallbackReason: null,
  };
  const contour =
    corners.contour ?? getDefaultCardContour(frame.pixels.width, frame.pixels.height, scanRegion);
  if (!corners.contour) {
    detection.fallbackReason = `card not detected (cardPresent=${corners.cardPresent}, sharpness=${corners.sharpness ?? "n/a"})`;
  }

  const dewarped = dewarpRgba(frame.pixels, contour, DEWARP_OUTPUT_SIZE);
  const best = await searchOriented(dewarped, options.scope, options.checkBothOrientations);
  const text =
    options.ocrEnabled && corners.contour && needsTextSearch(best.result)
      ? await searchByCardText(frame, corners.contour, best, options.scope)
      : null;
  const pick = text?.pick ?? best;

  const region = options.colorBarRegionKey
    ? COLOR_BAR_REGIONS_BY_GAME_KEY[options.colorBarRegionKey]
    : undefined;
  const detectedColor = region ? detectColorBarRgba(pick.pixels, region) : null;
  const resolved = await resolveCardSearchMatches(pick.result, (match) =>
    getCardById(match.cardId, options.scope.collectionGuid, match.lang),
  );

  return {
    ...preferDetectedColor(resolved, detectedColor),
    detection,
    contour: corners.contour,
    orientation: pick.orientation,
    embedding: pick.embedding,
    pixels: pick.pixels,
    search: pick.result.diagnostics ?? null,
    topDistance: pick.result.data?.[0]?.distance ?? pick.result.nearestDistance ?? null,
    ocr: text?.ocr ?? null,
    matchedBy: text?.pick ? "ocr" : "embedding",
    lowConfidenceMatch: !!text?.pick && !hasCardMatch(best.result),
    detectedColor,
  };
}

async function toOutcome(
  attempt: ScanAttempt,
  attempts: ScanAttempt[],
  matchesNeeded: number,
): Promise<IdentifyOutcome> {
  const capturedImageUrl = attempt.pixels
    ? await encodeJpegDataUrl(attempt.pixels, CAPTURED_IMAGE_JPEG_QUALITY).catch(() => null)
    : null;
  return {
    card: attempt.card,
    alternativeMatches: attempt.card ? attempt.alternativeMatches : [],
    capturedImageUrl,
    ...toScanMatchDetails(attempt, attempts, matchesNeeded, "web"),
  };
}

export async function identifyCard(
  capture: () => Promise<CapturedFrame>,
  options: IdentifyOptions,
  scanRegion: ScanRegion,
): Promise<IdentifyOutcome> {
  const attempts: ScanAttempt[] = [];
  const attempt = async () => {
    const outcome = await attemptOnce(capture, options, scanRegion);
    attempts.push(outcome);
    return outcome;
  };

  if (options.matchesNeeded <= 1) {
    return toOutcome(await attempt(), attempts, options.matchesNeeded);
  }

  let last: ScanAttempt | null = null;
  const maxAttempts = options.matchesNeeded + CONSENSUS_RETRY_BUDGET;
  for (let i = 0; i < maxAttempts; i++) {
    last = await attempt();
    const agreed = pickConsensus(attempts, options.matchesNeeded);
    if (agreed) return toOutcome(agreed, attempts, options.matchesNeeded);
  }
  return toOutcome({ ...last!, card: null }, attempts, options.matchesNeeded);
}
