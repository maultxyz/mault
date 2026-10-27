import {
  isCardCondition,
  ORDER_LINE_QUANTITY_MAX,
  ORDER_LINE_TEXT_MAX_LENGTH,
  ORDER_LINES_MAX,
  toCardCondition,
  type FulfilmentOrder,
  type FulfilmentOrderStatus,
  type OrderLine,
  type OrderLineInput,
  type OrderSource,
  type PlayingCard,
  type PullSheetEntry,
} from "@magic-vault/shared";
import { and, eq, ne, sql } from "drizzle-orm";
import { uuidArraySql } from "./sql-arrays";
import type { Transaction } from "../db";
import { fulfilmentOrders } from "../db/schema";
import { getUserDisplayName } from "../middleware/auth";
import type { PullSheetRow } from "./interfaces/business";

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, ORDER_LINE_TEXT_MAX_LENGTH);
  return trimmed || null;
}

function price(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value * 100) / 100
    : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

export function normalizeOrderLines(value: unknown): OrderLineInput[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.length > ORDER_LINES_MAX) return null;
  const lines: OrderLineInput[] = [];
  for (const raw of value) {
    const line = (raw ?? {}) as Record<string, unknown>;
    const name = text(line.name);
    if (!name) return null;
    const quantity = Number(line.quantity);
    lines.push({
      name,
      setCode: text(line.setCode),
      setName: text(line.setName),
      collectorNumber: text(line.collectorNumber),
      condition: isCardCondition(line.condition) ? line.condition : null,
      isFoil: typeof line.isFoil === "boolean" ? line.isFoil : null,
      quantity:
        Number.isInteger(quantity) && quantity >= 1
          ? Math.min(quantity, ORDER_LINE_QUANTITY_MAX)
          : 1,
      unitPrice: price(line.unitPrice),
      orderRef: text(line.orderRef),
    });
  }
  return lines;
}

export function toOrderLines(value: unknown): OrderLine[] {
  const lines = Array.isArray(value) ? value : [];
  return lines.map((raw) => {
    const line = (raw ?? {}) as Record<string, unknown>;
    const [normalized] = normalizeOrderLines([line]) ?? [
      { name: String(line.name ?? ""), quantity: 1 },
    ];
    const allocations = stringList(line.allocations);
    return {
      ...normalized,
      allocations,
      picked: stringList(line.picked).filter((id) => allocations.includes(id)),
    };
  });
}

function normalizeSetName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function existingScanIds(
  tx: Transaction,
  orgId: string,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const result = await tx.execute(sql`
    SELECT cc.guid::text AS scan_id
    FROM collection_cards cc
    JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
    WHERE cc.org_id = ${orgId}
      AND cc.guid = ANY(${uuidArraySql(ids)})
  `);
  return new Set(
    (result.rows as { scan_id: string }[]).map((row) => row.scan_id),
  );
}

async function allocatedElsewhere(
  tx: Transaction,
  orgId: string,
  orderId: number | null,
): Promise<Set<string>> {
  const rows = await tx
    .select({ lines: fulfilmentOrders.lines })
    .from(fulfilmentOrders)
    .where(
      and(
        eq(fulfilmentOrders.orgId, orgId),
        eq(fulfilmentOrders.status, "open"),
        eq(fulfilmentOrders.isDeleted, false),
        orderId === null ? undefined : ne(fulfilmentOrders.id, orderId),
      ),
    );
  const ids = new Set<string>();
  for (const row of rows) {
    for (const line of toOrderLines(row.lines)) {
      for (const id of line.allocations) ids.add(id);
    }
  }
  return ids;
}

async function findCandidates(
  tx: Transaction,
  orgId: string,
  line: OrderLineInput,
  excluded: Set<string>,
  limit: number,
): Promise<string[]> {
  const name = line.name.trim().toLowerCase();
  const setCode = line.setCode?.toLowerCase();
  const setName = line.setName ? normalizeSetName(line.setName) : null;
  const number = line.collectorNumber?.toLowerCase();
  const result = await tx.execute(sql`
    SELECT cc.guid::text AS scan_id
    FROM collection_cards cc
    JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
    LEFT JOIN intake_lots il ON il.id = cc.intake_lot_id
    LEFT JOIN storage_locations sl ON sl.id = cc.location_id AND sl.is_deleted = false
    WHERE cc.org_id = ${orgId}
      AND (il.id IS NULL OR il.status = 'accepted')
      AND (
        lower(cc.card_name) = ${name}
        OR lower(split_part(cc.card_name, ' // ', 1)) = ${name}
      )
      ${setCode ? sql`AND lower(cc.card_set) = ${setCode}` : sql``}
      ${!setCode && setName ? sql`AND regexp_replace(lower(cc.card_set_name), '[^a-z0-9]', '', 'g') = ${setName}` : sql``}
      ${number ? sql`AND lower(cc.card_collector_number) = ${number}` : sql``}
      ${line.condition ? sql`AND cc.condition = ${line.condition}` : sql``}
      ${line.isFoil != null ? sql`AND cc.is_foil = ${line.isFoil}` : sql``}
      ${excluded.size > 0 ? sql`AND NOT (cc.guid = ANY(${uuidArraySql([...excluded])}))` : sql``}
    ORDER BY (sl.id IS NULL), sl.name, cc.location_position, cc.id
    LIMIT ${limit}
  `);
  return (result.rows as { scan_id: string }[]).map((row) => row.scan_id);
}

export async function allocateOrderLines(
  tx: Transaction,
  orgId: string,
  orderId: number | null,
  lines: (OrderLineInput & Partial<Pick<OrderLine, "allocations" | "picked">>)[],
): Promise<OrderLine[]> {
  const excluded = await allocatedElsewhere(tx, orgId, orderId);
  const existing = await existingScanIds(
    tx,
    orgId,
    lines.flatMap((line) => line.allocations ?? []),
  );
  const kept = lines.map((line) =>
    (line.allocations ?? []).filter(
      (id) => existing.has(id) && !excluded.has(id),
    ),
  );
  for (const ids of kept) for (const id of ids) excluded.add(id);
  const result: OrderLine[] = [];
  for (const [index, line] of lines.entries()) {
    const allocations = kept[index].slice(0, line.quantity);
    const missing = line.quantity - allocations.length;
    if (missing > 0) {
      const found = await findCandidates(tx, orgId, line, excluded, missing);
      for (const id of found) excluded.add(id);
      allocations.push(...found);
    }
    result.push({
      ...line,
      allocations,
      picked: (line.picked ?? []).filter((id) => allocations.includes(id)),
    });
  }
  return result;
}

export async function loadPullSheet(
  tx: Transaction,
  orgId: string,
  lines: OrderLine[],
): Promise<PullSheetEntry[]> {
  const lineOf = new Map<string, number>();
  const picked = new Set<string>();
  lines.forEach((line, index) => {
    for (const id of line.allocations) lineOf.set(id, index);
    for (const id of line.picked) picked.add(id);
  });
  if (lineOf.size === 0) return [];
  const result = await tx.execute(sql`
    SELECT cc.guid::text AS scan_id,
      (cc.card - 'raw') AS card,
      cc.is_foil, cc.condition, cc.bin_number, cc.location_position,
      col.guid::text AS collection_guid, col.name AS collection_name,
      sl.name AS location_name
    FROM collection_cards cc
    JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
    LEFT JOIN storage_locations sl ON sl.id = cc.location_id AND sl.is_deleted = false
    WHERE cc.org_id = ${orgId}
      AND cc.guid = ANY(${uuidArraySql([...lineOf.keys()])})
    ORDER BY (sl.name IS NULL), sl.name, cc.location_position, col.name, cc.bin_number, cc.card_name
  `);
  return (result.rows as unknown as PullSheetRow[]).map((row) => ({
    scanId: row.scan_id,
    lineIndex: lineOf.get(row.scan_id) ?? 0,
    card: row.card as PlayingCard,
    isFoil: row.is_foil,
    condition: toCardCondition(row.condition),
    collectionGuid: row.collection_guid,
    collectionName: row.collection_name,
    binNumber: row.bin_number,
    locationName: row.location_name,
    locationPosition: row.location_position,
    picked: picked.has(row.scan_id),
  }));
}

export function summarizeOrder(
  row: {
    guid: string | null;
    name: string;
    source: string;
    status: string;
    createdAt: Date;
    closedAt: Date | null;
  },
  lines: OrderLine[],
  createdByName: string | null,
  canViewCosts: boolean,
  liveAllocated?: Set<string>,
): FulfilmentOrder {
  const isAllocated = (id: string) => !liveAllocated || liveAllocated.has(id);
  const priced = lines.filter((line) => line.unitPrice != null);
  return {
    guid: row.guid!,
    name: row.name,
    source: row.source as OrderSource,
    status: row.status as FulfilmentOrderStatus,
    lineCount: lines.length,
    quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    allocated: lines.reduce(
      (sum, line) => sum + line.allocations.filter(isAllocated).length,
      0,
    ),
    picked: lines.reduce(
      (sum, line) => sum + line.picked.filter(isAllocated).length,
      0,
    ),
    revenue:
      canViewCosts && priced.length > 0
        ? Math.round(
            priced.reduce(
              (sum, line) => sum + (line.unitPrice ?? 0) * line.quantity,
              0,
            ) * 100,
          ) / 100
        : null,
    createdAt: row.createdAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    createdByName,
  };
}

export async function orderCreatorName(
  userId: string | null,
): Promise<string | null> {
  return userId ? getUserDisplayName(userId) : null;
}
