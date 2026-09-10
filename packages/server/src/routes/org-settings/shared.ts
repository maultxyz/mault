import {
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_SCAN_REGION,
  type ChannelLayout,
} from "@magic-vault/shared";
import type { Transaction } from "../../db";

export function toScanRegion(row?: {
  scanCoverage: number | null;
  scanOffsetX: number | null;
  scanOffsetY: number | null;
}) {
  return {
    coverage:
      row?.scanCoverage != null
        ? row.scanCoverage / 100
        : DEFAULT_SCAN_REGION.coverage,
    offsetX:
      row?.scanOffsetX != null
        ? row.scanOffsetX / 100
        : DEFAULT_SCAN_REGION.offsetX,
    offsetY:
      row?.scanOffsetY != null
        ? row.scanOffsetY / 100
        : DEFAULT_SCAN_REGION.offsetY,
  };
}

export async function detectDefaultChannelLayout(
  tx: Transaction,
  orgId: string,
): Promise<ChannelLayout> {
  const existing = await tx.query.moduleConfigs.findFirst({
    where: (t, { eq }) => eq(t.orgId, orgId),
    columns: { id: true },
  });
  return existing ? "legacy" : DEFAULT_CHANNEL_LAYOUT;
}
