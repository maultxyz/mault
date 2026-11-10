import { consensusAttemptLimit } from "./scan-decisions";
import { pickConsensus } from "./consensus";
import { isStrongerTextMatch } from "./text-match";
import { CLOSE_MATCH_DELTA } from "./constants/ocr-regions.constant";
import type { CardSearchResult } from "./interfaces/api.interface";
import type {
  PlayingCard,
  PlayingCardWithDistance,
} from "./interfaces/card.interface";
import type {
  ColorResolvedMatches,
  DetectedColorEvidence,
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

function sameColors(a: PlayingCard, b: PlayingCard): boolean {
  const colorsOf = (card: PlayingCard) =>
    [...(card.colorIdentity ?? [])].sort().join(",");
  return colorsOf(a) === colorsOf(b);
}

export function preferDetectedColor<T extends ResolvedCardSearchMatches>(
  resolved: T,
  { gameHasColorBar, detectedColor, printingConfirmed }: DetectedColorEvidence,
): ColorResolvedMatches<T> {
  const { card } = resolved;
  if (!gameHasColorBar || !card)
    return { ...resolved, colorVariantUncertain: false };
  const all = [card, ...resolved.alternativeMatches];
  const colorVariants = all.filter((other) => other.name === card.name);
  if (!colorVariants.some((other) => !sameColors(other, card)))
    return { ...resolved, colorVariantUncertain: false };
  if (printingConfirmed) {
    return {
      ...resolved,
      colorVariantUncertain:
        detectedColor !== null && !card.colorIdentity?.includes(detectedColor),
    };
  }
  const preferred = detectedColor
    ? colorVariants.find((other) =>
        other.colorIdentity?.includes(detectedColor),
      )
    : undefined;
  if (!preferred) return { ...resolved, colorVariantUncertain: true };
  return {
    ...resolved,
    card: preferred,
    alternativeMatches: all.filter((other) => other !== preferred),
    colorVariantUncertain: false,
  };
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
          detectedColor: attempt.detectedColor,
          foilDetection: attempt.foilDetection ?? null,
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
  if (
    !options.ocrEnabled ||
    !options.readText ||
    !needsTextSearch(image.result)
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
    candidates
      .filter((candidate) => !!candidate.embedding)
      .map((candidate) => options.readText!(candidate)),
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
  const usesText = !!text && hasCardMatch(text.result);
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
