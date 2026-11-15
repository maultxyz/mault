import type { PickImportRequestOptions } from "@/lib/interfaces/business";
import {
  combineOrdersIntoPick,
  ORDER_NAME_MAX_LENGTH,
  type ComposedCsvOrder,
  type FulfilmentOrderInput,
} from "@magic-vault/shared";

export function applyPickImportOrderNames(
  orders: ComposedCsvOrder[],
  orderNames: (string | undefined)[],
): ComposedCsvOrder[] {
  return orders.map((order, index) => ({
    ...order,
    reference: orderNames[index]?.trim() || order.reference,
  }));
}

export function columnSampleValues(
  rows: string[][],
  columnIndex: number,
  count: number,
): string[] {
  const values: string[] = [];
  for (const row of rows) {
    const value = row[columnIndex]?.trim();
    if (value) values.push(value);
    if (values.length === count) break;
  }
  return values;
}

function pickName(name: string): string {
  return name.slice(0, ORDER_NAME_MAX_LENGTH);
}

export function buildPickImportRequests({
  orders,
  composition,
  createMode,
  pickName: chosenName,
  source,
  fallbackName,
  batchName,
}: PickImportRequestOptions): FulfilmentOrderInput[] {
  const name = chosenName.trim();
  const withLines = orders.filter((order) => order.lines.length > 0);
  if (withLines.length === 0) return [];
  if (composition === "single" || withLines.length === 1) {
    const [order] = withLines;
    return [
      {
        name: pickName(name || order.reference || fallbackName(0)),
        source,
        lines:
          composition === "single" ? order.lines : combineOrdersIntoPick([order]),
      },
    ];
  }
  if (createMode === "together") {
    return [
      {
        name: pickName(name || batchName(withLines.length)),
        source,
        lines: combineOrdersIntoPick(withLines),
      },
    ];
  }
  return withLines.map((order, index) => ({
    name: pickName(order.reference || fallbackName(index)),
    source,
    lines: combineOrdersIntoPick([order]),
  }));
}
