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
  settings: { ocrEnabled: boolean; highAccuracyScans?: boolean } | null | undefined,
  gameSupportsOcr: boolean,
): ScanOcrMode {
  if (!settings?.ocrEnabled || !gameSupportsOcr) return "off";
  return settings.highAccuracyScans ? "every-scan" : "when-unsure";
}

export function prefersTextMatch(
  imageResult: CardSearchResult,
  textOcr: { printingConfirmed?: boolean } | null | undefined,
): boolean {
  return needsTextSearch(imageResult) || !!textOcr?.printingConfirmed;
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
    closeMatches.map(
      async (match): Promise<PlayingCardWithDistance | null> => {
        const card =
          match.card ?? (await lookupMatchedCard(match).catch(() => null));
        return card
          ? { ...card, distance: match.distance, confidence: match.confidence }
          : null;
      },
    ),
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
    ? colorVariants.find((other) => other.colorIdentity?.includes(detectedColor))
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
