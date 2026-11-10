import {
  searchByImage,
  searchByText,
  searchByVector,
} from "@/features/cards/api/card";
import { getCardById } from "@/features/cards/api/card-search";
import {
  canvasToBlob,
  extractCardImage,
} from "@/features/scanner/lib/card-detection";
import { detectAndDewarpCard } from "@/features/scanner/lib/client-vectorize";
import { detectColorBar } from "@/features/scanner/lib/color-bar";
import { detectFoil } from "@/features/scanner/lib/foil-detection";
import { dewarpCard } from "@/features/scanner/lib/perspective-warp";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import {
  embedCanvas,
  rotateCanvas180,
} from "@/features/scanner/lib/milo-client";
import type {
  MatchScope,
  OrientedCandidate,
  OrientedSearch,
  OrientedSearchPick,
  ScanAttemptOutcome,
  ScanOutcome,
} from "@/lib/interfaces/scanner";
import { scanLog } from "@/lib/scan-log";
import {
  identifyScanImage,
  identifyScanWithConsensus,
  searchScanOrientations,
  OCR_CROP_HEIGHT,
  OCR_CROP_WIDTH,
  preferDetectedColor,
  resolveCardSearchMatches,
  toScanMatchDetails,
  type CardContour,
  type ColorBarRegion,
  type ScanDetectionDiagnostics,
} from "@magic-vault/shared";

function appendMatchScope(formData: FormData, scope: MatchScope): void {
  if (scope.collectionGuid)
    formData.append("collectionGuid", scope.collectionGuid);
  if (scope.preferredSetCodes?.length)
    formData.append(
      "preferredSetCodes",
      JSON.stringify(scope.preferredSetCodes),
    );
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
  return searchScanOrientations(checkBothOrientations, async (orientation) => {
    const oriented =
      orientation === "rotated" ? rotateCanvas180(canvas) : canvas;
    return { ...(await search(oriented)), canvas: oriented, orientation };
  });
}

function readCanvasPixels(canvas: HTMLCanvasElement): ImageData | null {
  if (!canvas.width || !canvas.height) return null;
  return (
    canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height) ??
    null
  );
}

export async function captureDewarpedCardImage(
  canvas: HTMLCanvasElement,
  refreshFrame: () => void,
): Promise<ImageData | null> {
  refreshFrame();
  const { dewarpedCanvas } = await detectAndDewarpCard(canvas, refreshFrame);
  if (!dewarpedCanvas) return null;
  try {
    return readCanvasPixels(dewarpedCanvas);
  } finally {
    releaseCanvases([dewarpedCanvas]);
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
  readColorBarFromScan: boolean,
  foilDetectionGameKey: string | null,
  context: Pick<
    ScanAttemptOutcome,
    | "detectedContour"
    | "vectorizedOn"
    | "detection"
    | "ocr"
    | "lowConfidenceMatch"
    | "matchedBy"
    | "dewarpedCardImage"
  >,
): Promise<ScanAttemptOutcome> {
  const detectedColor =
    colorBarRegion && readColorBarFromScan
      ? detectColorBar(best.canvas, colorBarRegion)
      : null;
  const { colorVariantUncertain, ...resolved } = preferDetectedColor(
    await resolveCardSearchMatches(
      best.result,
      async (match) =>
        (await getCardById(match.cardId, collectionGuid, match.lang)).data,
    ),
    {
      gameHasColorBar: !!colorBarRegion,
      detectedColor,
      printingConfirmed:
        context.matchedBy === "ocr" && !!context.ocr?.printingConfirmed,
    },
  );
  const topDistance =
    best.result.data?.[0]?.distance ?? best.result.nearestDistance ?? null;
  const foilDetection =
    foilDetectionGameKey && resolved.card
      ? detectFoil(best.canvas, foilDetectionGameKey)
      : null;
  return {
    ...resolved,
    ...context,
    lowConfidenceMatch: context.lowConfidenceMatch || colorVariantUncertain,
    detectedColor,
    foilDetection,
    debugImageUrl: best.canvas.toDataURL("image/jpeg", 0.8),
    search: best.result.diagnostics ?? null,
    orientation: best.orientation,
    embedding: best.embedding,
    topDistance,
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
  foilDetectionGameKey: string | null,
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
      foilDetectionGameKey,
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
  foilDetectionGameKey: string | null,
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
      const ocrCrops: HTMLCanvasElement[] = [];
      const identified = await identifyScanImage<OrientedCandidate>({
        checkBothOrientations,
        ocrEnabled: !!ocrEnabled && !!corners.contour,
        search: async (orientation) => {
          const oriented =
            orientation === "rotated"
              ? rotateCanvas180(dewarpedCanvas)
              : dewarpedCanvas;
          created.push(oriented);
          const embedding = await embedCanvas(oriented);
          const result = await searchByVector(
            buildSearchFormData(embedding, scope),
          );
          return { canvas: oriented, orientation, embedding, result };
        },
        readText: async (candidate) => {
          if (!corners.contour || !candidate.embedding) return null;
          const uprightCrop = dewarpCard(
            frame,
            corners.contour,
            OCR_CROP_WIDTH,
            OCR_CROP_HEIGHT,
          );
          const crop =
            candidate.orientation === "rotated"
              ? rotateCanvas180(uprightCrop)
              : uprightCrop;
          ocrCrops.push(uprightCrop, crop);
          try {
            const result = await searchByText(
              buildSearchFormData(
                candidate.embedding,
                scope,
                await canvasToBlob(crop),
              ),
            );
            return { ...candidate, result, ocr: result.ocr ?? null };
          } catch (error) {
            console.error("[scanner] text search failed:", error);
            return null;
          }
        },
      }).finally(() => releaseCanvases(ocrCrops));
      const best = { ...identified.pick, alternate: null };
      scanLog(
        `[scanner] using AI card detection (confidence=${corners.confidence.toFixed(3)})`,
      );
      return toAttemptOutcome(
        best,
        collectionGuid,
        colorBarRegion,
        true,
        foilDetectionGameKey,
        {
          detectedContour: corners.contour,
          dewarpedCardImage: readCanvasPixels(dewarpedCanvas),
          vectorizedOn: "web",
          detection,
          ocr: identified.ocr,
          lowConfidenceMatch: identified.lowConfidenceMatch,
          matchedBy: identified.matchedBy,
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

  return toAttemptOutcome(
    best,
    collectionGuid,
    colorBarRegion,
    false,
    foilDetectionGameKey,
    {
      detectedContour: null,
      dewarpedCardImage: null,
      vectorizedOn: "server",
      detection: { ...detection, fallbackReason },
      ocr: null,
      lowConfidenceMatch: false,
      matchedBy: "embedding",
    },
  );
}

function toScanOutcome(
  outcome: ScanAttemptOutcome,
  attempts: ScanAttemptOutcome[],
  matchesNeeded: number,
): ScanOutcome {
  const {
    card,
    debugImageUrl,
    detectedContour,
    vectorizedOn,
    dewarpedCardImage,
  } = outcome;
  return {
    card,
    alternativeMatches: card ? outcome.alternativeMatches : [],
    debugImageUrl,
    detectedContour,
    vectorizedOn,
    dewarpedCardImage,
    ...toScanMatchDetails(outcome, attempts, matchesNeeded, vectorizedOn),
  };
}

export async function searchCardImageWithConsensus(
  canvas: HTMLCanvasElement,
  refreshFrame: () => void,
  contour: CardContour | null | undefined,
  scope: MatchScope,
  ocrEnabled: boolean | undefined,
  matchesNeeded: number,
  checkBothOrientations: boolean,
  colorBarRegion: ColorBarRegion | undefined,
  foilDetectionGameKey: string | null,
): Promise<ScanOutcome> {
  const outcome = await identifyScanWithConsensus(
    () =>
      searchCardImage(
        canvas,
        refreshFrame,
        contour,
        scope,
        ocrEnabled,
        checkBothOrientations,
        colorBarRegion,
        foilDetectionGameKey,
      ),
    (attempt) => attempt.card,
    matchesNeeded,
  );
  return toScanOutcome(
    { ...outcome.attempt, card: outcome.card },
    outcome.attempts,
    matchesNeeded,
  );
}
