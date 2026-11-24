import { SCAN_GIFT_REVEAL_MIN_PRICE } from "./constants/scan-gift-reveal.constant";
import { PRICE_SOURCE_FIELDS } from "./constants/price-source.constant";
import type { OrgPricing } from "./interfaces/card-condition.interface";
import type { ScanGiftReveal } from "./interfaces/scan-gift-reveal.interface";
import type { ScannedCard } from "./interfaces/scanner.interface";
import { cardPriceFor } from "./price-source";

export function isScanGiftRevealPrice(price: number | null | undefined): boolean {
  return price != null && price >= SCAN_GIFT_REVEAL_MIN_PRICE;
}

export function scanGiftRevealOf(
  scan: Pick<ScannedCard, "scanId" | "card" | "isFoil" | "foilType" | "stamp" | "condition">,
  pricing: OrgPricing,
  collectionGuid: string | null,
): ScanGiftReveal | null {
  const isFoil = !!scan.isFoil;
  const price = cardPriceFor(
    scan.card,
    { isFoil, foilType: scan.foilType, stamp: scan.stamp },
    pricing.source,
    scan.condition,
    pricing.conditionMultipliers,
  );
  if (price == null || !isScanGiftRevealPrice(price)) return null;
  return {
    scanId: scan.scanId,
    collectionGuid,
    cardName: scan.card.name,
    setName: scan.card.setName ?? null,
    image: scan.card.image,
    isFoil,
    price,
    currency: PRICE_SOURCE_FIELDS[pricing.source].currency,
  };
}
