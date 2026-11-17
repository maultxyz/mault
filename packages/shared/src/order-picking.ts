import type {
  FulfilmentOrderDetail,
  OrderBins,
  OrderBinsError,
  OrderLine,
  OrderLineInput,
  OrderSortPresetBin,
  PickOrderGroup,
  PickWalkEntry,
  PickWalkStop,
  PullSheetEntry,
} from "./interfaces/business.interface";
import type { PickList } from "./interfaces/pick-list.interface";
import { normalizePickListEntries } from "./pick-list";

export function combineOrdersIntoPick(
  orders: { reference: string | null; lines: OrderLineInput[] }[],
): OrderLineInput[] {
  return orders.flatMap((order) =>
    order.lines.map((line) => ({
      ...line,
      orderRef: order.reference?.trim() || line.orderRef || null,
    })),
  );
}

export function orderRefsOf(lines: Pick<OrderLine, "orderRef">[]): string[] {
  const refs: string[] = [];
  for (const line of lines) {
    if (line.orderRef && !refs.includes(line.orderRef)) refs.push(line.orderRef);
  }
  return refs;
}

export function pickOrderGroups(
  lines: OrderLine[],
  pullSheet: PullSheetEntry[],
  orderBins: OrderBins,
): PickOrderGroup[] {
  const groups = new Map<string | null, PickOrderGroup>();
  lines.forEach((line, lineIndex) => {
    const orderRef = line.orderRef ?? null;
    const group = groups.get(orderRef) ?? {
      orderRef,
      binNumber: orderRef == null ? null : (orderBins[orderRef] ?? null),
      lineIndexes: [],
      entries: [],
      quantity: 0,
      allocated: 0,
    };
    group.lineIndexes.push(lineIndex);
    group.quantity += line.quantity;
    group.allocated += Math.min(line.allocations.length, line.quantity);
    groups.set(orderRef, group);
  });
  for (const entry of pullSheet) {
    const orderRef = lines[entry.lineIndex]?.orderRef ?? null;
    groups.get(orderRef)?.entries.push(entry);
  }
  const unassigned = groups.get(null);
  groups.delete(null);
  return unassigned ? [...groups.values(), unassigned] : [...groups.values()];
}

export function orderSortCatchAllBin(binCount: number): number {
  return binCount;
}

export function autoAssignOrderBins(
  orderRefs: string[],
  current: OrderBins,
  binCount: number,
): OrderBins {
  const catchAllBin = orderSortCatchAllBin(binCount);
  const kept: OrderBins = {};
  const used = new Set<number>();
  for (const ref of orderRefs) {
    const bin = current[ref];
    if (bin != null && bin >= 1 && bin < catchAllBin && !used.has(bin)) {
      kept[ref] = bin;
      used.add(bin);
    }
  }
  let next = 1;
  for (const ref of orderRefs) {
    if (kept[ref] != null) continue;
    while (used.has(next)) next++;
    if (next >= catchAllBin) break;
    kept[ref] = next;
    used.add(next);
  }
  return kept;
}

export function orderBinsError(
  orderBins: OrderBins,
  binCount: number,
): OrderBinsError | null {
  const bins = Object.values(orderBins);
  if (bins.some((bin) => !Number.isInteger(bin) || bin < 1 || bin > binCount)) {
    return "outOfRange";
  }
  if (bins.includes(orderSortCatchAllBin(binCount))) return "catchAll";
  if (new Set(bins).size !== bins.length) return "duplicate";
  return null;
}

export function hasEveryOrderBin(orderRefs: string[], orderBins: OrderBins): boolean {
  return orderRefs.length > 0 && orderRefs.every((ref) => orderBins[ref] != null);
}

export function orderSortPresetGameKeys(groups: PickOrderGroup[]): string[] {
  const keys: string[] = [];
  for (const group of groups) {
    if (group.orderRef == null || group.binNumber == null) continue;
    for (const entry of group.entries) {
      if (entry.gameKey && !keys.includes(entry.gameKey)) keys.push(entry.gameKey);
    }
  }
  return keys;
}

export function buildOrderSortPresetBins(
  groups: PickOrderGroup[],
  gameKey: string,
  binCount: number,
): OrderSortPresetBin[] {
  const pickListByBin = new Map<number, PickList>();
  for (const group of groups) {
    if (group.orderRef == null || group.binNumber == null) continue;
    const entries = normalizePickListEntries(
      group.entries
        .filter((entry) => entry.gameKey === gameKey)
        .map((entry) => ({ name: entry.card.name, quantity: 1 })),
    ).map((entry) => ({ ...entry, found: 0 }));
    if (entries.length > 0) {
      pickListByBin.set(group.binNumber, { mode: "until_found", entries });
    }
  }
  const catchAllBin = orderSortCatchAllBin(binCount);
  return Array.from({ length: binCount }, (_, index) => {
    const binNumber = index + 1;
    return {
      binNumber,
      isCatchAll: binNumber === catchAllBin,
      pickList: pickListByBin.get(binNumber) ?? null,
    };
  });
}

const comparePickText = (left: string | null, right: string | null) =>
  (left ?? "").localeCompare(right ?? "", undefined, { numeric: true, sensitivity: "base" });

export function buildPickWalk(orders: FulfilmentOrderDetail[]): PickWalkEntry[] {
  return orders
    .filter((order) => order.status === "open")
    .flatMap((order) =>
      order.pullSheet.map((entry) => ({
        ...entry,
        orderGuid: order.guid,
        orderName: order.name,
        orderBin: entry.orderRef == null ? null : (order.orderBins[entry.orderRef] ?? null),
      })),
    )
    .sort(
      (left, right) =>
        Number(left.locationName === null) - Number(right.locationName === null) ||
        comparePickText(left.locationName, right.locationName) ||
        (left.locationPosition ?? 0) - (right.locationPosition ?? 0) ||
        comparePickText(left.collectionName, right.collectionName) ||
        (left.binNumber ?? 0) - (right.binNumber ?? 0) ||
        comparePickText(left.card.name, right.card.name),
    );
}

export function pickWalkStops(entries: PickWalkEntry[]): PickWalkStop[] {
  const stops: PickWalkStop[] = [];
  for (const entry of entries) {
    const stopKey =
      entry.locationName != null
        ? `location:${entry.locationName}`
        : `collection:${entry.collectionGuid}:${entry.binNumber ?? ""}`;
    const last = stops[stops.length - 1];
    if (last?.stopKey === stopKey) {
      last.entries.push(entry);
      continue;
    }
    stops.push({
      stopKey,
      locationName: entry.locationName,
      collectionName: entry.collectionName,
      binNumber: entry.locationName != null ? null : entry.binNumber,
      entries: [entry],
    });
  }
  return stops;
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

export function pickedScanIdsOf(orders: FulfilmentOrderDetail[]): Set<string> {
  return new Set(
    orders.flatMap((order) => order.pullSheet.filter((entry) => entry.picked).map((entry) => entry.scanId)),
  );
}

export function withOrderPicks(
  order: FulfilmentOrderDetail,
  scanIds: ReadonlySet<string>,
  isPicked: boolean,
): FulfilmentOrderDetail {
  const pullSheet = order.pullSheet.map((entry) =>
    scanIds.has(entry.scanId) ? { ...entry, picked: isPicked } : entry,
  );
  const pickedIds = new Set(pullSheet.filter((entry) => entry.picked).map((entry) => entry.scanId));
  const lines = order.lines.map((line) => ({
    ...line,
    picked: line.allocations.filter((id) => pickedIds.has(id)),
  }));
  return {
    ...order,
    lines,
    pullSheet,
    picked: lines.reduce((sum, line) => sum + line.picked.length, 0),
  };
}
