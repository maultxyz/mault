import { consensusAttemptLimit } from "./scan-decisions";
import { pickConsensus } from "./consensus";
import { isStrongerTextMatch } from "./text-match";
import { gameReadsPrintedLanguage } from "./card-language";
import { CLOSE_MATCH_DELTA } from "./constants/ocr-regions.constant";
import type { CardSearchResult } from "./interfaces/api.interface";
import type { PlayingCardWithDistance } from "./interfaces/card.interface";
import type {
  LookupMatchedCard,
  OrientedSearchCandidate,
  ResolvedCardSearchMatches,
  ScanAttemptResult,
  ScanImageCandidate,
  ScanImageSearchOptions,
  ScanImageSearchOutcome,
  ScanConsensusOutcome,
  ScanOrientation,
  ScanMatchDetails,
  ScanOcrMode,
} from "./interfaces/scan-identify.interface";
import type {
  ScanAttemptDiagnostic,
  ScanVectorizeSource,
} from "./interfaces/scanner.interface";

export function hasCardMatch(result: CardSearchResult): boolean {
  return (result.data?.length ?? 0) > 0;
}

export function needsTextSearch(result: CardSearchResult): boolean {
  const reason = result.diagnostics?.reason;
  if (reason === "too_far" || reason === "ambiguous") return true;
  const [leader, runnerUp] = result.data ?? [];
  return (
    leader != null &&
    runnerUp != null &&
    runnerUp.distance - leader.distance <= CLOSE_MATCH_DELTA
  );
}

export function scanOcrMode(
  settings:
    | { ocrEnabled: boolean; highAccuracyScans?: boolean }
    | null
    | undefined,
  gameSupportsOcr: boolean,
  readsPrintedLanguageEveryScan = false,
): ScanOcrMode {
  if (!settings?.ocrEnabled || !gameSupportsOcr) return "off";
  return settings.highAccuracyScans || readsPrintedLanguageEveryScan
    ? "every-scan"
    : "when-unsure";
}

export function readsPrintedLanguageEveryScan(
  collection: { matchAllLanguages?: boolean } | null | undefined,
  gameKey: string | null | undefined,
): boolean {
  return (
    !!collection?.matchAllLanguages &&
    !!gameKey &&
    gameReadsPrintedLanguage(gameKey)
  );
}

function imageMatchIsInOtherLanguage(
  imageResult: CardSearchResult,
  printedLanguage: string | null | undefined,
): boolean {
  const leader = imageResult.data?.[0];
  if (!printedLanguage || !leader) return false;
  return (leader.lang ?? leader.card?.lang) !== printedLanguage;
}

export function prefersTextMatch(
  imageResult: CardSearchResult,
  textOcr:
    | { printingConfirmed?: boolean; scopedToPrintedLanguage?: string | null }
    | null
    | undefined,
): boolean {
  return (
    needsTextSearch(imageResult) ||
    !!textOcr?.printingConfirmed ||
    imageMatchIsInOtherLanguage(imageResult, textOcr?.scopedToPrintedLanguage)
  );
}

export function pickBetterOrientation<T extends OrientedSearchCandidate>(
  upright: T,
  rotated: T,
): T & { alternate: T } {
  const rotatedWins =
    hasCardMatch(upright.result) !== hasCardMatch(rotated.result)
      ? hasCardMatch(rotated.result)
      : (rotated.result.nearestDistance ?? Number.POSITIVE_INFINITY) <
        (upright.result.nearestDistance ?? Number.POSITIVE_INFINITY);
  return rotatedWins
    ? { ...rotated, alternate: upright }
    : { ...upright, alternate: rotated };
}

export async function resolveCardSearchMatches(
  result: CardSearchResult,
  lookupMatchedCard: LookupMatchedCard,
): Promise<ResolvedCardSearchMatches> {
  const data = result.data;
  if (!data || data.length === 0) {
    return {
      card: null,
      alternativeMatches: [],
      noMatchReason: result.diagnostics?.reason ?? "too_far",
      candidates: [],
    };
  }
  const candidates = data.map((match) => ({
    cardId: match.cardId,
    name: match.card?.name ?? null,
    distance: match.distance,
    confidence: match.confidence,
  }));
  const closeMatches = data.filter(
    (match) => match.distance - data[0].distance <= CLOSE_MATCH_DELTA,
  );
  const resolved = await Promise.all(
    closeMatches.map(async (match): Promise<PlayingCardWithDistance | null> => {
      const card =
        match.card ?? (await lookupMatchedCard(match).catch(() => null));
      return card
        ? { ...card, distance: match.distance, confidence: match.confidence }
        : null;
    }),
  );
  const cards = resolved.filter(
    (card): card is PlayingCardWithDistance => card !== null,
  );
  if (cards.length === 0) {
    return {
      card: null,
      alternativeMatches: [],
      noMatchReason: "lookup_failed",
      lookupFailedCardIds: closeMatches.map((match) => match.cardId),
      candidates,
    };
  }
  const [card, ...alternativeMatches] = cards;
  return { card, alternativeMatches, noMatchReason: null, candidates };
}

function toAttemptDiagnostics(
  attempts: ScanAttemptResult[],
): ScanAttemptDiagnostic[] {
  return attempts.map((attempt) => ({
    reason: attempt.noMatchReason,
    cardId: attempt.card?.id ?? null,
    cardName: attempt.card?.name ?? null,
    distance: attempt.topDistance,
  }));
}

export function toScanMatchDetails(
  attempt: ScanAttemptResult,
  attempts: ScanAttemptResult[],
  matchesNeeded: number,
  vectorizedOn: ScanVectorizeSource,
): ScanMatchDetails {
  if (attempt.card) {
    return {
      matched: {
        lowConfidenceMatch: attempt.lowConfidenceMatch,
        diagnostics: {
          matchedBy: attempt.matchedBy,
          vectorizedOn,
          detection: attempt.detection,
          orientation: attempt.orientation,
          matchesNeeded,
          attempts: toAttemptDiagnostics(attempts),
          candidates: attempt.candidates,
          ocr: attempt.ocr,
          stampDetection: attempt.stampDetection ?? null,
          printedFoilMarker: attempt.printedFoilMarker ?? null,
          printingMarks: attempt.printingMarks ?? null,
        },
      },
      noMatch: null,
    };
  }
  const search = attempt.search
    ? (({ embedding: _embedding, ...rest }) => rest)(attempt.search)
    : null;
  return {
    matched: null,
    noMatch: {
      embedding: attempt.embedding,
      diagnostics: {
        reason: attempts.some((other) => other.card)
          ? "no_consensus"
          : (attempt.noMatchReason ?? "too_far"),
        search,
        detection: attempt.detection,
        orientation: attempt.orientation,
        matchesNeeded,
        attempts: toAttemptDiagnostics(attempts),
        lookupFailedCardIds: attempt.lookupFailedCardIds,
        ocr: attempt.ocr,
      },
    },
  };
}

export async function searchScanOrientations<T extends OrientedSearchCandidate>(
  checkBothOrientations: boolean,
  search: (orientation: ScanOrientation) => Promise<T>,
): Promise<T & { alternate: T | null }> {
  if (!checkBothOrientations)
    return { ...(await search("upright")), alternate: null };
  const [upright, rotated] = await Promise.all([
    search("upright"),
    search("rotated"),
  ]);
  return pickBetterOrientation(upright, rotated);
}

export async function identifyScanImage<T extends ScanImageCandidate>(
  options: ScanImageSearchOptions<T>,
): Promise<ScanImageSearchOutcome<T>> {
  const image = await searchScanOrientations(
    options.checkBothOrientations,
    options.search,
  );
  const mode =
    typeof options.ocrMode === "function"
      ? options.ocrMode(image)
      : (options.ocrMode ?? (options.ocrEnabled ? "when-unsure" : "off"));
  if (
    mode === "off" ||
    (mode === "when-unsure" && !needsTextSearch(image.result))
  ) {
    return {
      pick: image,
      alternate: image.alternate,
      ocr: null,
      matchedBy: "embedding",
      lowConfidenceMatch: false,
    };
  }
  const candidates: T[] = [image];
  if (image.alternate) candidates.push(image.alternate);
  const texts = await Promise.all(
    candidates.map(async (candidate) => {
      if (candidate.textResult !== undefined) {
        return candidate.textResult
          ? {
              ...candidate,
              result: candidate.textResult,
              ocr: candidate.textResult.ocr ?? null,
            }
          : null;
      }
      return candidate.embedding && options.readText
        ? options.readText(candidate)
        : null;
    }),
  );
  let bestIndex = 0;
  texts.forEach((text, index) => {
    if (
      isStrongerTextMatch(
        text ? { ...text.result, ocr: text.ocr ?? undefined } : null,
        texts[bestIndex]
          ? {
              ...texts[bestIndex]!.result,
              ocr: texts[bestIndex]!.ocr ?? undefined,
            }
          : null,
      )
    )
      bestIndex = index;
  });
  const text = texts[bestIndex];
  const ocr =
    text?.ocr ?? texts.find((candidate) => candidate?.ocr)?.ocr ?? null;
  const usesText =
    !!text && hasCardMatch(text.result) && prefersTextMatch(image.result, ocr);
  return {
    pick: usesText ? text : image,
    alternate: image.alternate,
    ocr,
    matchedBy: usesText ? "ocr" : "embedding",
    lowConfidenceMatch: usesText && !hasCardMatch(image.result),
  };
}

export async function identifyScanWithConsensus<T>(
  take: () => Promise<T>,
  cardOf: (attempt: T) => PlayingCardWithDistance | null,
  matchesNeeded: number,
): Promise<ScanConsensusOutcome<T>> {
  const attempts: T[] = [];
  const limit = matchesNeeded <= 1 ? 1 : consensusAttemptLimit(matchesNeeded);
  for (let index = 0; index < limit; index++) {
    const attempt = await take();
    attempts.push(attempt);
    if (matchesNeeded <= 1) return { attempt, attempts, card: cardOf(attempt) };
    const agreed = pickConsensus(
      attempts.map((item) => ({ attempt: item, card: cardOf(item) })),
      matchesNeeded,
    );
    if (agreed) return { attempt: agreed.attempt, attempts, card: agreed.card };
  }
  return { attempt: attempts[attempts.length - 1], attempts, card: null };
}
