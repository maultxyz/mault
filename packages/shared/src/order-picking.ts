import type {
  OrderBins,
  OrderBinsError,
  OrderLine,
  OrderLineInput,
  OrderSortPresetBin,
  PickOrderGroup,
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

export function pickOrderBins(orderBins: OrderBins, orderRefs: string[]): OrderBins {
  return Object.fromEntries(
    orderRefs
      .filter((ref) => orderBins[ref] != null)
      .map((ref) => [ref, orderBins[ref]]),
  );
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
