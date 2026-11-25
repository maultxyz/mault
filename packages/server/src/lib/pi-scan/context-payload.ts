import type { PiScanRunContext } from "../interfaces/pi-scan";
import type { ScanHostContextPayload } from "../interfaces/scan-host";

export function contextFromScanHostPayload(payload: ScanHostContextPayload): PiScanRunContext {
  return {
    ...payload,
    heights: new Map(payload.heights),
    counts: new Map(payload.counts),
    storageBatchStarts: new Map(payload.storageBatchStarts ?? []),
  };
}
