import { CLOSE_MATCH_DELTA } from "./constants/ocr-regions.constant";
import { CONSENSUS_RETRY_BUDGET } from "./constants/scanner.constant";
import type { SearchRank } from "./interfaces/api.interface";
import type { ConsensusStreak, UnmatchedReason } from "./interfaces/scanner.interface";

export function hasSearchMatch(result: {
  data?: readonly unknown[] | null;
}): boolean {
  return (result.data?.length ?? 0) > 0;
}

export function needsTextSearch(result: SearchRank): boolean {
  const reason = result.diagnostics?.reason;
  if (reason === "too_far" || reason === "ambiguous") return true;
  const [leader, runnerUp] = result.data ?? [];
  return (
    leader != null &&
    runnerUp != null &&
    runnerUp.distance - leader.distance <= CLOSE_MATCH_DELTA
  );
}

export function betterSearch<T extends SearchRank>(current: T, next: T): T {
  const currentHas = hasSearchMatch(current);
  const nextHas = hasSearchMatch(next);
  if (currentHas !== nextHas) return nextHas ? next : current;
  const currentDistance = current.nearestDistance ?? Number.POSITIVE_INFINITY;
  const nextDistance = next.nearestDistance ?? Number.POSITIVE_INFINITY;
  return nextDistance < currentDistance ? next : current;
}

export function closeMatchesOf<T extends { distance: number }>(
  matches: readonly T[],
): T[] {
  if (matches.length === 0) return [];
  const leader = matches[0].distance;
  return matches.filter(
    (match) => match.distance - leader <= CLOSE_MATCH_DELTA,
  );
}

export function colorMatches(
  card: { colorIdentity?: readonly string[] | null } | null | undefined,
  color: string | null,
): boolean {
  return !!color && !!card?.colorIdentity?.includes(color);
}

export function preferredColorIndex<
  T extends { colorIdentity?: readonly string[] | null },
>(cards: readonly T[], color: string | null): number {
  if (!color || cards.length === 0) return 0;
  const index = cards.findIndex((card) => colorMatches(card, color));
  return index < 0 ? 0 : index;
}

export function preferColoredCard<
  T extends { colorIdentity?: readonly string[] | null },
>(
  card: T | null,
  alternatives: readonly T[],
  color: string | null,
): { card: T; alternatives: T[] } | null {
  if (!card) return null;
  const all = [card, ...alternatives];
  const index = preferredColorIndex(all, color);
  if (index === 0) return null;
  const preferred = all[index];
  return {
    card: preferred,
    alternatives: all.filter((item) => item !== preferred),
  };
}

export function orderMatchesByColor<
  T extends {
    distance: number;
    card?: { colorIdentity?: readonly string[] | null } | null;
  },
>(matches: readonly T[] | null, color: string | null): T[] | null {
  if (!matches) return null;
  if (!color || matches.length === 0) return [...matches];
  const close = closeMatchesOf(matches);
  const preferred = close.find((match) => colorMatches(match.card, color));
  if (!preferred || preferred === matches[0]) return [...matches];
  return [
    preferred,
    ...close.filter((match) => match !== preferred),
    ...matches.filter((match) => !close.includes(match)),
  ];
}

export function emptyConsensus<T>(): ConsensusStreak<T> {
  return { id: null, count: 0, item: null };
}

export function advanceConsensus<T>(
  streak: ConsensusStreak<T>,
  item: T,
  id: string | null,
): ConsensusStreak<T> {
  if (id != null && id === streak.id) {
    return { id, count: streak.count + 1, item };
  }
  return { id, count: id != null ? 1 : 0, item: id != null ? item : null };
}

export function consensusMet<T>(
  streak: ConsensusStreak<T>,
  matchesNeeded: number,
): streak is ConsensusStreak<T> & { item: T } {
  return streak.item != null && streak.count >= matchesNeeded;
}

export function consensusAttemptLimit(matchesNeeded: number): number {
  return matchesNeeded + CONSENSUS_RETRY_BUDGET;
}

export function consensusMissReason(
  anyAttemptMatched: boolean,
  fallback: UnmatchedReason | null | undefined,
): UnmatchedReason {
  if (anyAttemptMatched) return "no_consensus";
  return fallback ?? "too_far";
}
