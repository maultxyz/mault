import { CONSENSUS_RETRY_BUDGET } from "./constants/scanner.constant";
import type { BinRoute } from "./interfaces/bin-routes.interface";
import type { UnmatchedReason } from "./interfaces/scanner.interface";

export function routeForBin(binNumber: number, routes: BinRoute[]): BinRoute {
  const found = routes.find((route) => route.binNumber === binNumber);
  if (found) return found;
  const lastModule = Math.max(1, ...routes.map((route) => route.module));
  return { binNumber, module: lastModule, direction: "bottom" };
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
