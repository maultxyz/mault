import { PI_SCAN_POLL_MS } from "../constants/pi-scan";
import type {
  PiScanRecoveryState,
  PiScanRunContext,
} from "../interfaces/pi-scan";

// Retain the in-flight card while paused. Reload the context in place so the
// caller re-evaluates that card against new rules and empty-bin timestamps.
export async function waitForPiScanResume(
  session: PiScanRecoveryState,
  reload: (context: PiScanRunContext) => Promise<PiScanRunContext>,
): Promise<boolean> {
  while (session.pauseRequested && !session.stopRequested) {
    session.phase = "paused";
    await new Promise((resolve) => setTimeout(resolve, PI_SCAN_POLL_MS));
  }
  if (session.stopRequested) return false;
  if (session.refreshRequested && session.context) {
    session.refreshRequested = false;
    const context = session.context;
    const fresh = await reload(context);
    const unsaved = context.contents.filter((entry) => {
      if (!entry.unsaved) return false;
      const bin = fresh.configs.find(
        (item) => item.binNumber === entry.binNumber,
      );
      return bin && entry.scannedAt > (bin.lastEmptiedAt ?? 0);
    });
    fresh.contents.push(...unsaved);
    for (const entry of unsaved) {
      const binNumber = entry.binNumber!;
      fresh.counts.set(binNumber, (fresh.counts.get(binNumber) ?? 0) + 1);
    }
    Object.assign(context, fresh);
    session.message = null;
  }
  // A second pause or stop may arrive while the reload is in flight.
  if (session.pauseRequested) return waitForPiScanResume(session, reload);
  return !session.stopRequested;
}
