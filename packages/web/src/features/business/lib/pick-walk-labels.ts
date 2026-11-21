import type { PickWalkEntry, PullSheetEntry } from "@magic-vault/shared";
import type { TFunction } from "i18next";

type PickWalkPlace = Pick<
  PullSheetEntry,
  "locationName" | "collectionName" | "binNumber"
>;

export function pickWalkPlaceTitle(
  place: PickWalkPlace,
  t: TFunction,
): string {
  if (place.locationName != null) return place.locationName;
  return place.binNumber == null
    ? place.collectionName
    : t("orders.pickWalk.collectionBin", {
        collection: place.collectionName,
        bin: place.binNumber,
      });
}

export function pickWalkSpotLabel(
  entry: PickWalkEntry,
  t: TFunction,
): string {
  if (entry.locationName != null) {
    return t("orders.pickWalk.slot", {
      position: (entry.locationPosition ?? 0) + 1,
    });
  }
  return entry.binNumber == null
    ? entry.collectionName
    : t("orders.pickWalk.bin", { bin: entry.binNumber });
}

export function pickWalkPrintingLabel(
  entry: PickWalkEntry,
  t: TFunction,
): string {
  return [
    entry.card.setName || entry.card.set.toUpperCase(),
    entry.card.collectorNumber ? `#${entry.card.collectorNumber}` : null,
    entry.condition,
    entry.isFoil ? t("table.foil") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function pickWalkOrderLabel(
  entry: PickWalkEntry,
  showOrderName: boolean,
  t: TFunction,
): string | null {
  const parts = [
    showOrderName ? entry.orderName : null,
    entry.orderRef != null
      ? t("orders.orderRefLabel", { order: entry.orderRef })
      : null,
    entry.orderBin != null
      ? t("orders.orderBinLabel", { bin: entry.orderBin })
      : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
