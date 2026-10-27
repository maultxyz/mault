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

export async function searchCardImageWithConsensus(
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
