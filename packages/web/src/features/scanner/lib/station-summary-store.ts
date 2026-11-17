import type { StationSummary } from "@/lib/interfaces/stations";
import { useSyncExternalStore } from "react";

let stationSummaries: ReadonlyMap<string, StationSummary> = new Map();
const summaryListeners = new Set<() => void>();

function summariesMatch(left: StationSummary, right: StationSummary): boolean {
  return (
    left.isRunning === right.isRunning &&
    left.totalCount === right.totalCount &&
    left.collectionName === right.collectionName
  );
}

export function setStationSummary(
  stationId: string,
  summary: StationSummary | null,
): void {
  const current = stationSummaries.get(stationId);
  if (summary && current && summariesMatch(current, summary)) return;
  if (!summary && !current) return;
  const next = new Map(stationSummaries);
  if (summary) next.set(stationId, summary);
  else next.delete(stationId);
  stationSummaries = next;
  summaryListeners.forEach((listener) => listener());
}

function subscribeStationSummaries(listener: () => void) {
  summaryListeners.add(listener);
  return () => {
    summaryListeners.delete(listener);
  };
}

function getStationSummaries() {
  return stationSummaries;
}

export function useStationSummaries(): ReadonlyMap<string, StationSummary> {
  return useSyncExternalStore(subscribeStationSummaries, getStationSummaries);
}
