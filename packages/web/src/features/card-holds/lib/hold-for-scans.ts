import type { CardHoldTarget } from "@/lib/interfaces/card-holds";
import {
  DEFAULT_CARD_CONDITION,
  type GroupedScannedCard,
  type PublicCardHold,
} from "@magic-vault/shared";

export function holdForScans(
  holdsByScanId: ReadonlyMap<string, PublicCardHold>,
  scanIds: string[],
): PublicCardHold | undefined {
  const holds = scanIds.map((scanId) => holdsByScanId.get(scanId));
  const ownHold = holds.find((hold) => hold?.isMine);
  if (ownHold) return ownHold;
  return holds.every(Boolean) ? holds[0] : undefined;
}

export function firstAvailableScanId(
  holdsByScanId: ReadonlyMap<string, PublicCardHold>,
  scanIds: string[],
): string | undefined {
  return scanIds.find((scanId) => !holdsByScanId.has(scanId));
}

export function toCardHoldTarget(entry: GroupedScannedCard): CardHoldTarget {
  return {
    scanIds: entry.scanIds,
    card: entry.card,
    isFoil: entry.isFoil ?? false,
    foilType: entry.foilType,
    condition: entry.condition ?? DEFAULT_CARD_CONDITION,
  };
}
