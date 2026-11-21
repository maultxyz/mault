import { sql } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  SCAN_SAVE_LOCK_TIMEOUT_MS,
  SCAN_SAVE_STATEMENT_TIMEOUT_MS,
  SLOW_SCAN_SAVE_LOG_THRESHOLD_MS,
} from "./constants/timing";
import type {
  ScanSaveKind,
  ScanSaveOutcome,
  ScanSaveStage,
} from "./interfaces/scan-save-timing";

export async function applyScanSaveTimeouts(tx: Transaction): Promise<void> {
  await tx.execute(
    sql`SELECT set_config('lock_timeout', ${String(SCAN_SAVE_LOCK_TIMEOUT_MS)}, true), set_config('statement_timeout', ${String(SCAN_SAVE_STATEMENT_TIMEOUT_MS)}, true)`,
  );
}

export function startScanSaveTimer(
  kind: ScanSaveKind,
  now: () => number = () => performance.now(),
  log: (message: string) => void = console.warn,
) {
  const startedAt = now();
  const elapsedMsByStage: Partial<Record<ScanSaveStage, number>> = {};
  const markStage = (stage: ScanSaveStage) => {
    elapsedMsByStage[stage] = Math.round(now() - startedAt);
  };
  return {
    markStage,
    markStageWhenSettled<T>(stage: ScanSaveStage, work: Promise<T>): Promise<T> {
      const mark = () => markStage(stage);
      work.then(mark, mark);
      return work;
    },
    finish(scanId: string, outcome: ScanSaveOutcome) {
      const totalMs = Math.round(now() - startedAt);
      if (totalMs < SLOW_SCAN_SAVE_LOG_THRESHOLD_MS) return;
      log(
        `[scan-save] slow ${kind} save ${JSON.stringify({ scanId, outcome, totalMs, elapsedMsByStage })}`,
      );
    },
  };
}
