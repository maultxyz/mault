import { DEFAULT_CAPTURE_SETTLE_DELAY_MS } from "@magic-vault/shared";
import { toScanRegion } from "../org-settings/shared";

export function toDevice(row: {
  guid: string | null;
  name: string;
  hardwareId: string | null;
  scanCoverage: number | null;
  scanOffsetX: number | null;
  scanOffsetY: number | null;
  captureSettleDelayMs: number | null;
  moduleCount: number;
  channelLayout: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    guid: row.guid!,
    name: row.name,
    hardwareId: row.hardwareId,
    scanRegion: toScanRegion(row),
    captureSettleDelayMs:
      row.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS,
    moduleCount: row.moduleCount,
    channelLayout: row.channelLayout,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
