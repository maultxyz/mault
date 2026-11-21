import { ORDER_PULL_SHEET_HEADERS } from "@/lib/constants/business";
import {
  formatStorageSlot,
  csvEscape,
  IMPLICIT_ORDER_REF,
  type OrderBins,
  type PullSheetEntry,
} from "@magic-vault/shared";

export function buildPullSheetCsv(
  entries: PullSheetEntry[],
  orderBins: OrderBins,
): string {
  const rows = entries.map((entry) => {
    const orderBin = orderBins[entry.orderRef ?? IMPLICIT_ORDER_REF];
    return [
      entry.locationName ?? entry.collectionName,
      entry.locationName
        ? formatStorageSlot(entry.locationPosition ?? 0, entry.locationBatchSize)
        : "",
      entry.collectionName,
      entry.binNumber == null ? "" : String(entry.binNumber),
      entry.card.name,
      entry.card.set.toUpperCase(),
      entry.card.collectorNumber,
      entry.condition,
      entry.isFoil ? "Foil" : "",
      entry.orderRef ?? "",
      orderBin == null ? "" : String(orderBin),
    ];
  });
  return [ORDER_PULL_SHEET_HEADERS, ...rows]
    .map((row) => row.map((value) => csvEscape(value)).join(","))
    .join("\r\n");
}
