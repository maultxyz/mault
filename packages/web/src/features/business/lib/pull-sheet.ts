import { ORDER_PULL_SHEET_HEADERS } from "@/lib/constants/business";
import {
  csvEscape,
  type OrderBins,
  type PullSheetEntry,
} from "@magic-vault/shared";

export function buildPullSheetCsv(
  entries: PullSheetEntry[],
  orderBins: OrderBins,
): string {
  const rows = entries.map((entry) => {
    const orderBin =
      entry.orderRef == null ? undefined : orderBins[entry.orderRef];
    return [
      entry.locationName ?? entry.collectionName,
      entry.locationName ? String((entry.locationPosition ?? 0) + 1) : "",
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
