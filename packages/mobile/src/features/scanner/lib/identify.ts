import {
  CARD_DETECTION_RETRY_INTERVAL_MS,
  CARD_DETECTION_RETRY_TIMEOUT_MS,
  COLOR_BAR_REGIONS_BY_GAME_KEY,
  CONSENSUS_RETRY_BUDGET,
  DEWARP_OUTPUT_SIZE,
  hasCardMatch,
  prefersTextMatch,
  OCR_CROP_HEIGHT,
  OCR_CROP_WIDTH,
  detectColorBarRgba,
  detectCardStampRgba,
  detectPrintedFoilMarkerRgba,
  PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY,
  dewarpRgba,
  getDefaultCardContour,
  isStrongerTextMatch,
  pickBetterOrientation,
  pickConsensus,
  preferDetectedColor,
  resolveCardSearchMatches,
  rotateRgba180,
  type CardContour,
  type CardTextSearchResult,
  type PrintingMarksPayload,
  type ScanOrientation,
  printingMarksPayload,
  type CornerDetection,
  type ScanDetectionDiagnostics,
  type ScanRegion,
  toScanMatchDetails,
  needsTextSearch,
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
  ReadOrientationText,
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

async function searchOrientationText(
  uprightOcrCrop: CapturedFrame["pixels"],
  orientation: OrientedPick["orientation"],
  embedding: number[],
  scope: MatchScope,
): Promise<CardTextSearchResult | null> {
  const crop = orientation === "rotated" ? rotateRgba180(uprightOcrCrop) : uprightOcrCrop;
  try {
    const uri = await writeJpegTempFile(crop, OCR_IMAGE_JPEG_QUALITY);
    return await searchByText(embedding, scope, uri);
  } catch {
    return null;
  }
}

async function searchOriented(
  pixels: CapturedFrame["pixels"],
  scope: MatchScope,
  checkBothOrientations: boolean,
  readTextWithImage: ReadOrientationText | null,
  printingMarksFor: (orientation: ScanOrientation) => PrintingMarksPayload | null,
): Promise<OrientedPick> {
  const search = async (oriented: CapturedFrame["pixels"], orientation: OrientedPick["orientation"]) => {
    const embedding = await embedCard(oriented);
    const [result, textResult] = await Promise.all([
      searchByVector(embedding, scope, printingMarksFor(orientation)),
      readTextWithImage ? readTextWithImage(orientation, embedding) : undefined,
    ]);
    return { pixels: oriented, orientation, embedding, result, textResult, alternate: null } satisfies OrientedPick;
  };
  if (!checkBothOrientations) return search(pixels, "upright");

  const [upright, rotated] = await Promise.all([
    search(pixels, "upright"),
    search(rotateRgba180(pixels), "rotated"),
  ]);
  return pickBetterOrientation(upright, rotated);
}

async function withTextSearch(best: OrientedPick, readText: ReadOrientationText): Promise<OrientedPick> {
  const withText = async (option: OrientedPick) => ({
    ...option,
    textResult: await readText(option.orientation, option.embedding),
  });
  const [upright, alternate] = await Promise.all([
    withText(best),
    best.alternate ? withText(best.alternate) : null,
  ]);
  return { ...upright, alternate };
}

function pickTextSearch(best: OrientedPick): { pick: OrientedPick | null; ocr: ScanAttempt["ocr"] } | null {
  const options = [best, best.alternate].filter(
    (option): option is OrientedPick => option?.textResult !== undefined,
  );
  if (options.length === 0) return null;
  const results = options.map((option) => option.textResult ?? null);
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
  const cardContour = corners.contour;
  let uprightOcrCrop: CapturedFrame["pixels"] | null = null;
  const ocrCrop = (contourForCrop: CardContour) =>
    (uprightOcrCrop ??= dewarpRgba(frame.pixels, contourForCrop, OCR_CROP_WIDTH, OCR_CROP_HEIGHT));
  const readText: ReadOrientationText = (orientation, embedding) => {
    if (!cardContour) return Promise.resolve(null);
    return searchOrientationText(ocrCrop(cardContour), orientation, embedding, options.scope);
  };
  const imageBest = await searchOriented(
    dewarped,
    options.scope,
    options.checkBothOrientations,
    options.ocrMode === "every-scan" && cardContour ? readText : null,
    (orientation) => printingMarksPayload(frame.pixels, cardContour, options.gameKey, orientation),
  );
  const best =
    options.ocrMode === "when-unsure" && cardContour && needsTextSearch(imageBest.result)
      ? await withTextSearch(imageBest, readText)
      : imageBest;
  const text = pickTextSearch(best);
  const textPick = text?.pick && prefersTextMatch(best.result, text.ocr) ? text.pick : null;
  const pick = textPick ?? best;

  const region = options.colorBarRegionKey
    ? COLOR_BAR_REGIONS_BY_GAME_KEY[options.colorBarRegionKey]
    : undefined;
  const detectedColor =
    region && corners.contour ? detectColorBarRgba(pick.pixels, region) : null;
  const matchedBy = textPick ? "ocr" : "embedding";
  const { colorVariantUncertain, ...resolved } = preferDetectedColor(
    await resolveCardSearchMatches(pick.result, (match) =>
      getCardById(match.cardId, options.scope.collectionGuid, match.lang, match.gameKey),
    ),
    {
      gameHasColorBar: !!region,
      detectedColor,
      printingConfirmed: matchedBy === "ocr" && !!text?.ocr?.printingConfirmed,
    },
  );

  return {
    ...resolved,
    detection,
    contour: corners.contour,
    orientation: pick.orientation,
    embedding: pick.embedding,
    pixels: pick.pixels,
    search: pick.result.diagnostics ?? null,
    topDistance: pick.result.data?.[0]?.distance ?? pick.result.nearestDistance ?? null,
    ocr: text?.ocr ?? null,
    matchedBy,
    lowConfidenceMatch: (!!textPick && !hasCardMatch(best.result)) || colorVariantUncertain,
    detectedColor,
    printingMarks: pick.result.printingMarks ?? null,
    stampDetection:
      corners.contour && resolved.card?.stamps?.length
        ? detectCardStampRgba(pick.pixels, resolved.card)
        : null,
    printedFoilMarker:
      cardContour && options.gameKey && PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY[options.gameKey]
        ? detectPrintedFoilMarkerRgba(
            pick.orientation === "rotated" ? rotateRgba180(ocrCrop(cardContour)) : ocrCrop(cardContour),
            options.gameKey,
          )
        : null,
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
