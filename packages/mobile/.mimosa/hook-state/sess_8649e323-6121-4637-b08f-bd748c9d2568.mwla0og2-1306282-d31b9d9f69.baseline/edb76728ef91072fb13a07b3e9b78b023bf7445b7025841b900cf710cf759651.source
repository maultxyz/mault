import {
  CARD_DETECTION_RETRY_INTERVAL_MS,
  CARD_DETECTION_RETRY_TIMEOUT_MS,
  DEWARP_OUTPUT_SIZE,
  OCR_CROP_HEIGHT,
  OCR_CROP_WIDTH,
  detectCardStampRgba,
  detectPrintedFoilMarkerRgba,
  PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY,
  dewarpRgba,
  getDefaultCardContour,
  identifyScanImage,
  identifyScanWithConsensus,
  resolveCardSearchMatches,
  rotateRgba180,
  type CardContour,
  type CardTextSearchResult,
  printingMarksPayload,
  type CornerDetection,
  type ScanDetectionDiagnostics,
  type ScanRegion,
  toScanMatchDetails,
} from "@magic-vault/shared";
import {
  getCardById,
  searchByText,
  searchByVector,
} from "@/features/scanner/api/card-search";
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
  while (
    !detection.cardPresent &&
    Date.now() - start < CARD_DETECTION_RETRY_TIMEOUT_MS
  ) {
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
  const crop =
    orientation === "rotated" ? rotateRgba180(uprightOcrCrop) : uprightOcrCrop;
  try {
    const uri = await writeJpegTempFile(crop, OCR_IMAGE_JPEG_QUALITY);
    return await searchByText(embedding, scope, uri);
  } catch {
    return null;
  }
}

async function attemptOnce(
  capture: () => Promise<CapturedFrame>,
  options: IdentifyOptions,
  scanRegion: ScanRegion,
): Promise<ScanAttempt> {
  const { frame, detection: corners } = await detectWithRetry(
    capture,
    options.minSharpness,
  );
  const detection: ScanDetectionDiagnostics = {
    cardDetected: corners.cardPresent,
    sharpness: corners.sharpness,
    confidence: corners.confidence,
    fallbackReason: null,
  };
  const contour =
    corners.contour ??
    getDefaultCardContour(frame.pixels.width, frame.pixels.height, scanRegion);
  if (!corners.contour) {
    detection.fallbackReason = `card not detected (cardPresent=${corners.cardPresent}, sharpness=${corners.sharpness ?? "n/a"})`;
  }

  const dewarped = dewarpRgba(frame.pixels, contour, DEWARP_OUTPUT_SIZE);
  const cardContour = corners.contour;
  let uprightOcrCrop: CapturedFrame["pixels"] | null = null;
  const ocrCrop = (contourForCrop: CardContour) =>
    (uprightOcrCrop ??= dewarpRgba(
      frame.pixels,
      contourForCrop,
      OCR_CROP_WIDTH,
      OCR_CROP_HEIGHT,
    ));
  const readText: ReadOrientationText = (orientation, embedding) => {
    if (!cardContour) return Promise.resolve(null);
    return searchOrientationText(
      ocrCrop(cardContour),
      orientation,
      embedding,
      options.scope,
    );
  };
  const identified = await identifyScanImage({
    checkBothOrientations: options.checkBothOrientations,
    ocrMode: cardContour ? options.ocrMode : "off",
    search: async (orientation) => {
      const pixels =
        orientation === "rotated" ? rotateRgba180(dewarped) : dewarped;
      const embedding = await embedCard(pixels);
      const [result, textResult] = await Promise.all([
        searchByVector(
          embedding,
          options.scope,
          printingMarksPayload(
            frame.pixels,
            cardContour,
            options.gameKey,
            orientation,
          ),
        ),
        options.ocrMode === "every-scan" && cardContour
          ? readText(orientation, embedding)
          : undefined,
      ]);
      return { pixels, orientation, embedding, result, textResult };
    },
    readText: async (candidate) => {
      const result = await readText(candidate.orientation, candidate.embedding);
      return result ? { ...candidate, result, ocr: result.ocr ?? null } : null;
    },
  });
  const pick = identified.pick;
  const matchedBy = identified.matchedBy;
  const resolved = await resolveCardSearchMatches(pick.result, (match) =>
    getCardById(
      match.cardId,
      options.scope.collectionGuid,
      match.lang,
      match.gameKey,
    ),
  );

  return {
    ...resolved,
    detection,
    contour: corners.contour,
    orientation: pick.orientation,
    embedding: pick.embedding,
    pixels: pick.pixels,
    search: pick.result.diagnostics ?? null,
    topDistance:
      pick.result.data?.[0]?.distance ?? pick.result.nearestDistance ?? null,
    ocr: identified.ocr,
    matchedBy,
    lowConfidenceMatch: identified.lowConfidenceMatch,
    printingMarks: pick.result.printingMarks ?? null,
    stampDetection:
      corners.contour && resolved.card?.stamps?.length
        ? detectCardStampRgba(pick.pixels, resolved.card)
        : null,
    printedFoilMarker:
      cardContour &&
      options.gameKey &&
      PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY[options.gameKey]
        ? detectPrintedFoilMarkerRgba(
            pick.orientation === "rotated"
              ? rotateRgba180(ocrCrop(cardContour))
              : ocrCrop(cardContour),
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
    ? await encodeJpegDataUrl(
        attempt.pixels,
        CAPTURED_IMAGE_JPEG_QUALITY,
      ).catch(() => null)
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
  const result = await identifyScanWithConsensus(
    () => attemptOnce(capture, options, scanRegion),
    (attempt) => attempt.card,
    options.matchesNeeded,
  );
  return toOutcome(
    { ...result.attempt, card: result.card },
    result.attempts,
    options.matchesNeeded,
  );
}
