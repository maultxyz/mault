import {
  CLOSE_MATCH_DELTA,
  CONSENSUS_RETRY_BUDGET,
  areAllChaosBinsFull,
  areAllRepackPacksComplete,
  evaluateAlphabetBin,
  evaluateCardBin,
  evaluateChaosBin,
  evaluatePickListBin,
  evaluateRepackBin,
  evaluateScanOnlyBin,
  findAutoAssignTarget,
  findLowMatchCatchAll,
  getChaosBins,
  getRepackPackBins,
  isRulesMode,
  resolveOverflowBin,
  type BinConfig,
  type BinRoute,
  type BinRuleGroup,
  type BinSet,
  type FieldMeta,
  type SourceCard,
  type UnmatchedReason,
} from "@magic-vault/shared";

interface SearchRank {
  data?: readonly { distance: number }[] | null;
  nearestDistance?: number | null;
  diagnostics?: { reason?: string | null } | null;
}

interface ConsensusStreak<T> {
  id: string | null;
  count: number;
  item: T | null;
}

interface ScanBinDeps {
  countCopies: (bin: BinConfig) => number;
  countInBin: (bin: BinConfig) => number;
  isBinFull: (bin: BinConfig) => boolean;
  binRoom: (bin: BinConfig) => number;
  cardsInBin: (bin: BinConfig) => SourceCard[];
  newId: () => string;
}

export interface ChosenScanBin {
  bin: BinConfig | undefined;
  autoAssign: { binNumber: number; rules: BinRuleGroup } | null;
  pickListName: string | null;
}

type ScanHold =
  | { reason: "chaos-full"; binNumbers: number[] }
  | { reason: "repack-complete"; binNumbers: number[] }
  | { reason: "bin-full"; bin: BinConfig };

export function routeForBin(binNumber: number, routes: BinRoute[]): BinRoute {
  const found = routes.find((route) => route.binNumber === binNumber);
  if (found) return found;
  const lastModule = Math.max(1, ...routes.map((route) => route.module));
  return { binNumber, module: lastModule, direction: "bottom" };
}

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

function colorMatches(
  card: { colorIdentity?: readonly string[] | null } | null | undefined,
  color: string | null,
): boolean {
  return !!color && !!card?.colorIdentity?.includes(color);
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

function cardName(card: SourceCard): string {
  const name = (card as { name?: unknown }).name;
  return typeof name === "string" ? name : "";
}

function selectScanBin(
  card: SourceCard,
  set: BinSet | undefined,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  deps: Omit<ScanBinDeps, "newId">,
): BinConfig | undefined {
  const lowMatch = findLowMatchCatchAll(card, configs);
  if (lowMatch) {
    return isRulesMode(set)
      ? resolveOverflowBin(lowMatch, configs, deps.isBinFull)
      : lowMatch;
  }
  if (set?.scanOnly) return evaluateScanOnlyBin(configs, set.scanOnlyBin);
  if (set?.isChaosMode) return evaluateChaosBin(configs, deps.isBinFull);
  if (set?.isAlphabetMode) {
    return evaluateAlphabetBin(
      card,
      configs,
      set.alphabetPass,
      set.alphabetPrefix,
    );
  }
  if (set?.isRepackMode) {
    return evaluateRepackBin(
      card,
      configs,
      fieldDefinitions,
      set,
      deps.cardsInBin,
      deps.binRoom,
    );
  }
  return evaluateCardBin(
    card,
    configs,
    fieldDefinitions,
    set?.autoAssignField ? undefined : deps.countCopies,
    deps.countInBin,
    deps.isBinFull,
  );
}

export function chooseScanBin(
  card: SourceCard,
  set: BinSet | undefined,
  configs: BinConfig[],
  pickConfigs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  deps: ScanBinDeps,
): ChosenScanBin {
  const pickMatch =
    !isRulesMode(set) || findLowMatchCatchAll(card, pickConfigs)
      ? null
      : evaluatePickListBin(cardName(card), pickConfigs);
  let bin =
    pickMatch?.bin ??
    selectScanBin(card, set, configs, fieldDefinitions, deps);
  const autoAssign =
    pickMatch || set?.isRepackMode
      ? null
      : findAutoAssignTarget(
          card,
          configs,
          fieldDefinitions,
          set?.autoAssignField ?? null,
          deps.newId,
        );
  if (autoAssign) {
    bin = configs.find((item) => item.binNumber === autoAssign.binNumber);
  }
  return {
    bin,
    autoAssign,
    pickListName: pickMatch?.entry.name ?? null,
  };
}

export function scanHoldReason(
  card: SourceCard,
  set: BinSet | undefined,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  matchedBin: BinConfig | undefined,
  deps: Pick<ScanBinDeps, "isBinFull" | "binRoom" | "cardsInBin">,
): ScanHold | null {
  const lowMatch = findLowMatchCatchAll(card, configs);
  if (
    set?.isChaosMode &&
    matchedBin?.isCatchAll &&
    !lowMatch &&
    areAllChaosBinsFull(configs, deps.isBinFull)
  ) {
    return {
      reason: "chaos-full",
      binNumbers: getChaosBins(configs).map((bin) => bin.binNumber),
    };
  }
  if (
    matchedBin?.isCatchAll &&
    !lowMatch &&
    set?.isRepackMode &&
    areAllRepackPacksComplete(
      configs,
      fieldDefinitions,
      set,
      deps.cardsInBin,
      deps.binRoom,
    )
  ) {
    return {
      reason: "repack-complete",
      binNumbers: getRepackPackBins(configs, set)
        .map((bin) => bin.binNumber)
        .sort((a, b) => a - b),
    };
  }
  if (matchedBin && deps.isBinFull(matchedBin)) {
    return { reason: "bin-full", bin: matchedBin };
  }
  return null;
}
