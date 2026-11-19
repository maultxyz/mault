import type { SyncState } from "@magic-vault/shared";
import type { CardSyncProgress } from "@/lib/interfaces/admin-cards";

export function formatSyncDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function computeCardSyncProgress(syncState: SyncState, measuredAtMs: number): CardSyncProgress {
  const isBrowserJob = syncState.vectorizeOn === "browser";
  const total = isBrowserJob ? Math.max(0, syncState.total - syncState.skipped) : syncState.total;
  const done = isBrowserJob ? syncState.processed + syncState.errors : syncState.processed + syncState.skipped;
  const elapsedMs = syncState.startedAt ? measuredAtMs - new Date(syncState.startedAt).getTime() : 0;
  const etaMs =
    syncState.status === "running" && done > 0 && total > done && elapsedMs > 0 ? (elapsedMs / done) * (total - done) : null;
  return { total, done, etaMs, isBrowserJob };
}
