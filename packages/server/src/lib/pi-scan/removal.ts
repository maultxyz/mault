import {
  scanIdsToRemove,
  selectableRemovalCopies,
  type PiScanRemovalAction,
} from "@magic-vault/shared";
import type { PiScanRemovalQueue } from "../interfaces/pi-scan";

export async function updatePiScanRemovalQueue(
  queue: PiScanRemovalQueue,
  action: PiScanRemovalAction,
  remove: (scanIds: string[]) => Promise<boolean>,
): Promise<boolean> {
  if (queue.removalBusy) return false;
  queue.removalBusy = true;
  try {
    if (action.action === "select") {
      const entry = queue.removalEntries.find(
        (item) => item.entryId === action.entryId,
      );
      if (
        !entry ||
        !selectableRemovalCopies(entry, queue.removalEntries).some(
          (copy) => copy.scanId === action.scanId,
        )
      )
        return false;
      entry.selectedScanId = action.scanId;
    } else if (action.action === "drop") {
      queue.removalEntries = queue.removalEntries.filter(
        (entry) => entry.entryId !== action.entryId,
      );
    } else if (action.action === "clear") {
      queue.removalEntries = [];
    } else if (action.action === "remove") {
      const scanIds = scanIdsToRemove(queue.removalEntries);
      if (scanIds.length && !(await remove(scanIds))) return false;
      queue.removalEntries = [];
    } else return false;
    return true;
  } finally {
    queue.removalBusy = false;
  }
}
