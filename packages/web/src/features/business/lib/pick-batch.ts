import type { BatchPullSheetEntry } from "@/lib/interfaces/business";
import type { FulfilmentOrderDetail } from "@magic-vault/shared";

const compareText = (left: string | null, right: string | null) =>
  (left ?? "").localeCompare(right ?? "", undefined, { numeric: true, sensitivity: "base" });

export function buildBatchPullSheet(orders: FulfilmentOrderDetail[]): BatchPullSheetEntry[] {
  return orders
    .filter((order) => order.status === "open")
    .flatMap((order) =>
      order.pullSheet.map((entry) => ({ ...entry, orderGuid: order.guid, orderName: order.name })),
    )
    .sort(
      (left, right) =>
        Number(left.locationName === null) - Number(right.locationName === null) ||
        compareText(left.locationName, right.locationName) ||
        (left.locationPosition ?? 0) - (right.locationPosition ?? 0) ||
        compareText(left.collectionName, right.collectionName) ||
        (left.binNumber ?? 0) - (right.binNumber ?? 0) ||
        compareText(left.card.name, right.card.name),
    );
}

export function fullyPickedOrders(
  orders: FulfilmentOrderDetail[],
  pickedScanIds: ReadonlySet<string>,
): FulfilmentOrderDetail[] {
  return orders.filter(
    (order) =>
      order.status === "open" &&
      order.pullSheet.length > 0 &&
      order.pullSheet.every((entry) => pickedScanIds.has(entry.scanId)),
  );
}
