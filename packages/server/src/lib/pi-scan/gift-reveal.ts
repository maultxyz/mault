import {
  SCAN_GIFT_REVEAL_EVENT,
  scanGiftRevealOf,
  type ScannedCard,
} from "@magic-vault/shared";
import { db } from "../../db";
import { loadOrgPricing } from "../price-source";
import { emitToOrg } from "../session-stream";

export async function emitPiScanGiftReveal(
  orgId: string,
  collectionGuid: string,
  record: ScannedCard,
): Promise<void> {
  const pricing = await loadOrgPricing(db, orgId);
  const reveal = scanGiftRevealOf(record, pricing, collectionGuid);
  if (reveal) emitToOrg(orgId, SCAN_GIFT_REVEAL_EVENT, reveal);
}
