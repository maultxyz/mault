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
import { detectStamp } from "@/features/scanner/lib/card-stamp";
import { detectPrintedFoilMarker } from "@/features/scanner/lib/printed-foil-marker";
import { printingMarksSampler } from "@/features/scanner/lib/printing-marks";
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
  TextSearchOutcome,
} from "@/lib/interfaces/scanner";
import { scanLog } from "@/lib/scan-log";
import {
  CONSENSUS_RETRY_BUDGET,
  hasCardMatch,
  isStrongerTextMatch,
  needsTextSearch,
  OCR_CROP_HEIGHT,
  OCR_CROP_WIDTH,
  pickBetterOrientation,
  pickConsensus,
  prefersTextMatch,
  resolveCardSearchMatches,
  toScanMatchDetails,
  type CardContour,
  type CardTextSearchResult,
  type PrintingMarksPayload,
  type ScanOcrMode,
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
  if (scope.matchGameKeys?.length)
    formData.append("matchGameKeys", JSON.stringify(scope.matchGameKeys));
}

function buildSearchFormData(
  embedding: number[],
  scope: MatchScope,
  image?: Blob,
  printingMarks?: PrintingMarksPayload | null,
): FormData {
  const formData = new FormData();
  if (image) formData.append("image", image, "card.jpg");
  appendMatchScope(formData, scope);
  formData.append("embedding", JSON.stringify(embedding));
  if (printingMarks) {
    formData.append("printingMarks", printingMarks.encoded);
    formData.append("printingMarksGameKey", printingMarks.gameKey);
  }
  return formData;
}

async function searchBothOrientations(
  canvas: HTMLCanvasElement,
  checkBothOrientations: boolean,
  search: (
    canvas: HTMLCanvasElement,
    orientation: OrientedCandidate["orientation"],
  ) => Promise<OrientedSearch>,
): Promise<OrientedSearchPick> {
  if (!checkBothOrientations)
    return {
      ...(await search(canvas, "upright")),
      canvas,
      orientation: "upright",
      alternate: null,
    };

  const rotatedCanvas = rotateCanvas180(canvas);
  const [upright, rotated] = await Promise.all([
    search(canvas, "upright").then(
      (found): OrientedCandidate => ({
        ...found,
        canvas,
        orientation: "upright",
      }),
    ),
    search(rotatedCanvas, "rotated").then(
      (found): OrientedCandidate => ({
        ...found,
        canvas: rotatedCanvas,
        orientation: "rotated",
      }),
    ),
  ]);

  return pickBetterOrientation(upright, rotated);
}

async function searchOrientationText(
  uprightOcrCrop: HTMLCanvasElement,
  orientation: OrientedCandidate["orientation"],
  embedding: number[],
  scope: MatchScope,
  created: HTMLCanvasElement[],
): Promise<CardTextSearchResult | null> {
  const crop =
    orientation === "rotated"
      ? rotateCanvas180(uprightOcrCrop)
      : uprightOcrCrop;
  if (crop !== uprightOcrCrop) created.push(crop);
  try {
    const result = await searchByText(
      buildSearchFormData(embedding, scope, await canvasToBlob(crop)),
    );
    scanLog(
      `[scanner] OCR (${orientation}): name="${result.ocr?.readout.name ?? ""}" setLine="${result.ocr?.readout.setLine ?? ""}" number="${result.ocr?.readout.number ?? ""}" closestName=${result.ocr?.matchedName ? `"${result.ocr.matchedName}" (${(result.ocr.nameScore ?? 0).toFixed(2)})` : "none"} -> ${hasCardMatch(result) ? `matched ${result.data![0].cardId} at ${result.data![0].distance.toFixed(3)}` : "no match"}`,
    );
    return result;
  } catch (err) {
    console.error("[scanner] text search failed:", err);
    return null;
  }
}

async function withTextSearch(
  best: OrientedSearchPick,
  readText: (
    orientation: OrientedCandidate["orientation"],
    embedding: number[],
  ) => Promise<CardTextSearchResult | null>,
): Promise<OrientedSearchPick> {
  const withText = async <T extends OrientedCandidate>(option: T) =>
    option.embedding
      ? {
          ...option,
          textResult: await readText(option.orientation, option.embedding),
        }
      : option;
  const [upright, alternate] = await Promise.all([
    withText(best),
    best.alternate ? withText(best.alternate) : null,
  ]);
  return { ...upright, alternate };
}

function pickTextSearch(best: OrientedSearchPick): TextSearchOutcome | null {
  const options = [best, best.alternate].filter(
    (option): option is OrientedCandidate => option?.textResult !== undefined,
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
  return {
    pick: { ...options[bestIndex], result, alternate: null },
    ocr,
  };
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
  scanWasDewarped: boolean,
  context: Pick<
    ScanAttemptOutcome,
    | "detectedContour"
    | "vectorizedOn"
    | "detection"
    | "ocr"
    | "lowConfidenceMatch"
    | "matchedBy"
    | "dewarpedCardImage"
    | "printedFoilMarker"
  >,
): Promise<ScanAttemptOutcome> {
  const resolved = await resolveCardSearchMatches(
    best.result,
    async (match) =>
      (
        await getCardById(
          match.cardId,
          collectionGuid,
          match.lang,
          match.gameKey,
        )
      ).data,
  );
  const topDistance =
    best.result.data?.[0]?.distance ?? best.result.nearestDistance ?? null;
  const stampDetection = scanWasDewarped
    ? detectStamp(best.canvas, resolved.card)
    : null;
  return {
    ...resolved,
    ...context,
    lowConfidenceMatch: context.lowConfidenceMatch,
    stampDetection,
    printingMarks: best.result.printingMarks ?? null,
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
  ocrMode: ScanOcrMode,
  checkBothOrientations: boolean,
  gameKey: string | undefined,
): Promise<ScanAttemptOutcome> {
  const created: HTMLCanvasElement[] = [];
  try {
    return await runCardImageSearch(
      created,
      canvas,
      refreshFrame,
      contour,
      scope,
      ocrMode,
      checkBothOrientations,
      gameKey,
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
  ocrMode: ScanOcrMode,
  checkBothOrientations: boolean,
  gameKey: string | undefined,
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
      const cardContour = corners.contour;
      let uprightOcrCrop: HTMLCanvasElement | null = null;
      const ocrCrop = () => {
        if (!uprightOcrCrop && cardContour) {
          uprightOcrCrop = dewarpCard(
            frame,
            cardContour,
            OCR_CROP_WIDTH,
            OCR_CROP_HEIGHT,
          );
          created.push(uprightOcrCrop);
        }
        return uprightOcrCrop;
      };
      const readText = (
        orientation: OrientedCandidate["orientation"],
        embedding: number[],
      ) => {
        const crop = ocrCrop();
        return crop
          ? searchOrientationText(crop, orientation, embedding, scope, created)
          : Promise.resolve(null);
      };
      const printingMarksFor = printingMarksSampler(
        frame,
        cardContour,
        gameKey,
      );
      const readsTextWithImage = ocrMode === "every-scan" && !!cardContour;
      const imageBest = await searchBothOrientations(
        dewarpedCanvas,
        checkBothOrientations,
        async (oriented, orientation) => {
          const embedding = await embedCanvas(oriented);
          const [result, textResult] = await Promise.all([
            searchByVector(
              buildSearchFormData(
                embedding,
                scope,
                undefined,
                printingMarksFor(orientation),
              ),
            ),
            readsTextWithImage ? readText(orientation, embedding) : undefined,
          ]);
          return { result, embedding, textResult };
        },
      );
      created.push(imageBest.canvas);
      if (imageBest.alternate) created.push(imageBest.alternate.canvas);
      const best =
        ocrMode === "when-unsure" &&
        cardContour &&
        needsTextSearch(imageBest.result)
          ? await withTextSearch(imageBest, readText)
          : imageBest;

      scanLog(
        `[scanner] using AI card detection (confidence=${corners.confidence.toFixed(3)})`,
      );
      const text = pickTextSearch(best);
      const textPick =
        text?.pick && prefersTextMatch(best.result, text.ocr)
          ? text.pick
          : null;
      if (text) {
        scanLog(
          textPick
            ? `[scanner] OCR match used (${needsTextSearch(best.result) ? "embedding unsure" : "printing confirmed"})`
            : text.pick
              ? "[scanner] OCR match ignored (confident embedding match, printing not confirmed)"
              : "[scanner] OCR found no match",
        );
      }
      const pick = textPick ?? best;
      const printedFoilMarker = detectPrintedFoilMarker(
        ocrCrop,
        pick.orientation,
        gameKey,
      );
      return toAttemptOutcome(pick, collectionGuid, true, {
        printedFoilMarker,
        detectedContour: corners.contour,
        dewarpedCardImage: readCanvasPixels(dewarpedCanvas),
        vectorizedOn: "web",
        detection,
        ocr: text?.ocr ?? null,
        lowConfidenceMatch: !!textPick && !hasCardMatch(best.result),
        matchedBy: textPick ? "ocr" : "embedding",
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

  return toAttemptOutcome(best, collectionGuid, false, {
    printedFoilMarker: null,
    detectedContour: null,
    dewarpedCardImage: null,
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
  ocrMode: ScanOcrMode,
  matchesNeeded: number,
  checkBothOrientations: boolean,
  gameKey: string | undefined,
): Promise<ScanOutcome> {
  const attempts: ScanAttemptOutcome[] = [];
  const attempt = async () => {
    const outcome = await searchCardImage(
      canvas,
      refreshFrame,
      contour,
      scope,
      ocrMode,
      checkBothOrientations,
      gameKey,
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
