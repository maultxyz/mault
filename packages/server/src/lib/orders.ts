import {
  isCardCondition,
  orderLineIdentity,
  orderRefsOf,
  ORDER_LINE_QUANTITY_MAX,
  ORDER_LINE_TEXT_MAX_LENGTH,
  ORDER_LINES_MAX,
  ORDER_SUBSTITUTES_LIMIT,
  orderSubstituteCost,
  orderSubstituteDifferences,
  toCardCondition,
  type FulfilmentOrder,
  type FulfilmentOrderStatus,
  type OrderLine,
  type OrderBins,
  type OrderLineInput,
  type OrderLineSubstitute,
  type OrderSource,
  type OrderSubstituteCandidate,
  type PlayingCard,
  type PullSheetEntry,
} from "@magic-vault/shared";
import { and, eq, ne, sql } from "drizzle-orm";
import { uuidArraySql } from "./sql-arrays";
import type { Transaction } from "../db";
import { fulfilmentOrders } from "../db/schema";
import { getUserDisplayName } from "../middleware/auth";
import { ORDER_SUBSTITUTE_CANDIDATES_SCANNED } from "./constants/business";
import type {
  OrderSubstituteCandidateRow,
  PullSheetRow,
} from "./interfaces/business";
import { hydrateSavedCards } from "./saved-cards";
import type {
  OrderLineCandidateRequest,
  OrderLineCandidateRow,
} from "./interfaces/order-line-candidates";
import {
  groupOrderLineCandidates,
  normalizeOrderLineCandidateName,
  orderLineCandidateLimits,
  takeOrderLineCandidates,
  toOrderLineCandidateRequest,
} from "./order-line-candidates";

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
      language: text(line.language),
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

export function carryOverOrderAllocations(
  editedLines: OrderLineInput[],
  previousLines: OrderLine[],
  { keepPreviousUnitPrices }: { keepPreviousUnitPrices: boolean },
): (OrderLineInput & Pick<OrderLine, "allocations" | "picked">)[] {
  const unusedPreviousLines: (OrderLine | null)[] = [...previousLines];
  const takeMatch = (identityOf: (line: OrderLineInput) => string, line: OrderLineInput) => {
    const identity = identityOf(line);
    const index = unusedPreviousLines.findIndex(
      (previous) => previous != null && identityOf(previous) === identity,
    );
    if (index === -1) return undefined;
    const match = unusedPreviousLines[index] ?? undefined;
    unusedPreviousLines[index] = null;
    return match;
  };
  const exactMatches = editedLines.map((line) =>
    takeMatch(orderLineIdentity, line),
  );
  return editedLines.map((line, index) => {
    const match =
      exactMatches[index] ??
      takeMatch(
        (candidate) => orderLineIdentity({ ...candidate, orderRef: null }),
        line,
      );
    return {
      ...line,
      unitPrice: keepPreviousUnitPrices
        ? (match?.unitPrice ?? null)
        : line.unitPrice,
      allocations: match?.allocations ?? [],
      picked: match?.picked ?? [],
    };
  });
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

export async function allocatedElsewhere(
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

async function findCandidatesForLines(
  tx: Transaction,
  orgId: string,
  requests: OrderLineCandidateRequest[],
  excluded: ReadonlySet<string>,
): Promise<Map<number, string[]>> {
  if (requests.length === 0) return new Map();
  const result = await tx.execute(sql`
    WITH requested_lines AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(requests)}::jsonb) AS l(
        line_index int, name text, set_code text, set_name text,
        collector_number text, condition text, is_foil boolean, candidate_limit int
      )
    )
    SELECT l.line_index, candidate.scan_id
    FROM requested_lines l
    CROSS JOIN LATERAL (
      SELECT cc.guid::text AS scan_id, (sl.id IS NULL) AS has_no_location,
        sl.name AS location_name, cc.location_position, cc.id AS row_id
      FROM collection_cards cc
      JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
      LEFT JOIN intake_lots il ON il.id = cc.intake_lot_id
      LEFT JOIN storage_locations sl ON sl.id = cc.location_id AND sl.is_deleted = false
      WHERE cc.org_id = ${orgId}
        AND (il.id IS NULL OR il.status = 'accepted')
        AND (
          lower(cc.card_name) = l.name
          OR lower(split_part(cc.card_name, ' // ', 1)) = l.name
        )
        AND (l.set_code IS NULL OR lower(cc.card_set) = l.set_code)
        AND (l.set_name IS NULL OR regexp_replace(lower(cc.card_set_name), '[^a-z0-9]', '', 'g') = l.set_name)
        AND (l.collector_number IS NULL OR lower(cc.card_collector_number) = l.collector_number)
        AND (l.condition IS NULL OR cc.condition = l.condition)
        AND (l.is_foil IS NULL OR cc.is_foil = l.is_foil)
        ${excluded.size > 0 ? sql`AND NOT (cc.guid = ANY(${uuidArraySql([...excluded])}))` : sql``}
      ORDER BY (sl.id IS NULL), sl.name, cc.location_position, cc.id
      LIMIT l.candidate_limit
    ) candidate
    ORDER BY l.line_index, candidate.has_no_location, candidate.location_name,
      candidate.location_position, candidate.row_id
  `);
  return groupOrderLineCandidates(result.rows as unknown as OrderLineCandidateRow[]);
}

async function findSubstituteCandidates(
  tx: Transaction,
  orgId: string,
  line: OrderLineInput,
  excluded: Set<string>,
  onlyScanIds: string[] | null,
): Promise<OrderSubstituteCandidateRow[]> {
  const name = line.name.trim().toLowerCase();
  const result = await tx.execute(sql`
    SELECT cc.guid::text AS scan_id, cc.card_set AS set_code, cc.card_set_name AS set_name,
      cc.card_collector_number AS collector_number, cc.condition, cc.is_foil
    FROM collection_cards cc
    JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
    LEFT JOIN intake_lots il ON il.id = cc.intake_lot_id
    WHERE cc.org_id = ${orgId}
      AND (il.id IS NULL OR il.status = 'accepted')
      AND (
        lower(cc.card_name) = ${name}
        OR lower(split_part(cc.card_name, ' // ', 1)) = ${name}
      )
      ${onlyScanIds ? sql`AND cc.guid = ANY(${uuidArraySql(onlyScanIds)})` : sql``}
      ${excluded.size > 0 ? sql`AND NOT (cc.guid = ANY(${uuidArraySql([...excluded])}))` : sql``}
    LIMIT ${ORDER_SUBSTITUTE_CANDIDATES_SCANNED}
  `);
  return result.rows as unknown as OrderSubstituteCandidateRow[];
}

function toSubstituteCandidate(row: OrderSubstituteCandidateRow): OrderSubstituteCandidate {
  return {
    setCode: row.set_code,
    setName: row.set_name,
    collectorNumber: row.collector_number,
    condition: toCardCondition(row.condition),
    isFoil: row.is_foil,
  };
}

export async function loadOrderLineSubstitutes(
  tx: Transaction,
  orgId: string,
  line: OrderLine,
): Promise<OrderLineSubstitute[]> {
  const excluded = await allocatedElsewhere(tx, orgId, null);
  const ranked = (await findSubstituteCandidates(tx, orgId, line, excluded, null))
    .map((row) => ({ row, cost: orderSubstituteCost(line, toSubstituteCandidate(row)) }))
    .sort((left, right) => left.cost - right.cost)
    .slice(0, ORDER_SUBSTITUTES_LIMIT);
  const entries = await loadPullSheet(tx, orgId, [
    { ...line, allocations: ranked.map(({ row }) => row.scan_id), picked: [] },
  ]);
  const entryByScanId = new Map(entries.map((entry) => [entry.scanId, entry]));
  return ranked.flatMap(({ row }) => {
    const entry = entryByScanId.get(row.scan_id);
    return entry
      ? [{ entry, differences: orderSubstituteDifferences(line, toSubstituteCandidate(row)) }]
      : [];
  });
}

export async function isOrderLineSubstituteAvailable(
  tx: Transaction,
  orgId: string,
  line: OrderLine,
  scanId: string,
): Promise<boolean> {
  const excluded = await allocatedElsewhere(tx, orgId, null);
  const rows = await findSubstituteCandidates(tx, orgId, line, excluded, [scanId]);
  return rows.length === 1;
}

export async function allocateOrderLines(
  tx: Transaction,
  orgId: string,
  orderId: number | null,
  lines: (OrderLineInput & Partial<Pick<OrderLine, "allocations" | "picked">>)[],
  releasedScanIds: ReadonlySet<string> = new Set(),
): Promise<OrderLine[]> {
  const excluded = await allocatedElsewhere(tx, orgId, orderId);
  for (const id of releasedScanIds) excluded.add(id);
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
  const missingByLine = lines.map(
    (line, index) => line.quantity - Math.min(kept[index].length, line.quantity),
  );
  const candidateLimits = orderLineCandidateLimits(
    lines.map((line, index) => ({
      normalizedName: normalizeOrderLineCandidateName(line.name),
      missing: missingByLine[index],
    })),
  );
  const candidatesByLineIndex = await findCandidatesForLines(
    tx,
    orgId,
    lines.flatMap((line, index) =>
      missingByLine[index] > 0
        ? [toOrderLineCandidateRequest(line, index, candidateLimits[index])]
        : [],
    ),
    excluded,
  );
  const result: OrderLine[] = [];
  for (const [index, line] of lines.entries()) {
    const allocations = kept[index].slice(0, line.quantity);
    const missing = missingByLine[index];
    if (missing > 0) {
      const found = takeOrderLineCandidates(
        candidatesByLineIndex.get(index) ?? [],
        excluded,
        missing,
      );
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
      col.lang AS collection_lang, g.key AS game_key,
      sl.name AS location_name
    FROM collection_cards cc
    JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
    LEFT JOIN games g ON g.id = col.game_id
    LEFT JOIN storage_locations sl ON sl.id = cc.location_id AND sl.is_deleted = false
    WHERE cc.org_id = ${orgId}
      AND cc.guid = ANY(${uuidArraySql([...lineOf.keys()])})
    ORDER BY (sl.name IS NULL), sl.name, cc.location_position, col.name, cc.bin_number, cc.card_name
  `);
  const rows = result.rows as unknown as PullSheetRow[];
  const cards = await hydrateSavedCards(
    rows.map((row) => ({
      gameKey: row.game_key,
      lang: row.collection_lang,
      card: row.card as PlayingCard,
    })),
    { includeRaw: false },
  );
  return rows.map((row, i) => ({
    scanId: row.scan_id,
    lineIndex: lineOf.get(row.scan_id) ?? 0,
    card: cards[i],
    isFoil: row.is_foil,
    condition: toCardCondition(row.condition),
    collectionGuid: row.collection_guid,
    collectionName: row.collection_name,
    binNumber: row.bin_number,
    locationName: row.location_name,
    locationPosition: row.location_position,
    picked: picked.has(row.scan_id),
    orderRef: lines[lineOf.get(row.scan_id) ?? 0]?.orderRef ?? null,
    gameKey: row.game_key,
  }));
}

export function toOrderBins(value: unknown, lines: OrderLineInput[]): OrderBins {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const bins: OrderBins = {};
  for (const ref of orderRefsOf(lines)) {
    const bin = raw[ref];
    if (typeof bin === "number" && Number.isInteger(bin) && bin >= 1) {
      bins[ref] = bin;
    }
  }
  return bins;
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
