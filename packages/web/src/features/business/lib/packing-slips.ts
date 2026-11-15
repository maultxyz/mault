import type {
  PackingSlipData,
  PackingSlipRow,
  PackingSlipUnavailableLine,
} from "@/lib/interfaces/business";
import type { FulfilmentOrderDetail, OrderLine, PullSheetEntry } from "@magic-vault/shared";

function rowsFromAllocatedCopies(line: OrderLine, copies: PullSheetEntry[]): PackingSlipRow[] {
  const rowsByPrinting = new Map<string, PackingSlipRow>();
  for (const copy of copies.slice(0, line.quantity)) {
    const key = [copy.card.set, copy.card.collectorNumber, copy.condition, copy.isFoil].join("|");
    const existing = rowsByPrinting.get(key);
    if (existing) {
      existing.quantity += 1;
      continue;
    }
    rowsByPrinting.set(key, {
      key: `${copy.lineIndex}|${key}`,
      image: copy.card.image ?? null,
      name: copy.card.name,
      setCode: copy.card.set,
      collectorNumber: copy.card.collectorNumber,
      condition: copy.condition,
      isFoil: copy.isFoil,
      quantity: 1,
      unitPrice: line.unitPrice ?? null,
    });
  }
  return [...rowsByPrinting.values()];
}

function rowFromLine(line: OrderLine, lineIndex: number, quantity: number): PackingSlipRow {
  return {
    key: `${lineIndex}`,
    image: null,
    name: line.name,
    setCode: line.setCode ?? null,
    collectorNumber: line.collectorNumber ?? null,
    condition: line.condition ?? null,
    isFoil: line.isFoil ?? false,
    quantity,
    unitPrice: line.unitPrice ?? null,
  };
}

export function buildPackingSlips(order: FulfilmentOrderDetail): PackingSlipData[] {
  if (order.status === "cancelled") return [];
  const copiesByLine = new Map<number, PullSheetEntry[]>();
  for (const entry of order.pullSheet) {
    copiesByLine.set(entry.lineIndex, [...(copiesByLine.get(entry.lineIndex) ?? []), entry]);
  }
  const slipsByRef = new Map<string, PackingSlipData>();
  order.lines.forEach((line, lineIndex) => {
    const refKey = line.orderRef ?? "";
    let slip = slipsByRef.get(refKey);
    if (!slip) {
      slip = {
        key: `${order.guid}|${refKey}`,
        orderGuid: order.guid,
        pickName: order.name,
        orderRef: line.orderRef ?? null,
        date: order.closedAt ?? order.createdAt,
        rows: [],
        unavailable: [],
      };
      slipsByRef.set(refKey, slip);
    }
    const packedRows =
      order.status === "open"
        ? rowsFromAllocatedCopies(line, copiesByLine.get(lineIndex) ?? [])
        : line.picked.length > 0
          ? [rowFromLine(line, lineIndex, Math.min(line.picked.length, line.quantity))]
          : [];
    slip.rows.push(...packedRows);
    const packedQuantity = packedRows.reduce((sum, row) => sum + row.quantity, 0);
    if (packedQuantity < line.quantity) {
      const unavailable: PackingSlipUnavailableLine = {
        name: line.name,
        quantity: line.quantity - packedQuantity,
      };
      slip.unavailable.push(unavailable);
    }
  });
  return [...slipsByRef.values()];
}

export function packingSlipSubtotal(slip: PackingSlipData): number | null {
  const pricedRows = slip.rows.filter((row) => row.unitPrice !== null);
  if (pricedRows.length === 0) return null;
  return (
    Math.round(
      pricedRows.reduce((sum, row) => sum + (row.unitPrice ?? 0) * row.quantity, 0) * 100,
    ) / 100
  );
}
