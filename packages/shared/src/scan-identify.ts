import { CLOSE_MATCH_DELTA } from "./constants/ocr-regions.constant";
import type { CardSearchResult } from "./interfaces/api.interface";
import type { PlayingCardWithDistance } from "./interfaces/card.interface";
import type {
  LookupMatchedCard,
  OrientedSearchCandidate,
  ResolvedCardSearchMatches,
  ScanAttemptResult,
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

export function preferDetectedColor<T extends ResolvedCardSearchMatches>(
  resolved: T,
  detectedColor: string | null,
): T {
  if (!detectedColor || !resolved.card) return resolved;
  const all = [resolved.card, ...resolved.alternativeMatches];
  const preferred = all.find((card) =>
    card.colorIdentity?.includes(detectedColor),
  );
  if (!preferred || preferred === resolved.card) return resolved;
  return {
    ...resolved,
    card: preferred,
    alternativeMatches: all.filter((card) => card !== preferred),
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
