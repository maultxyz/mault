import { sql, type SQL } from "drizzle-orm";
import type { Transaction } from "../db";
import type { RankedIdPage, RankedIdPageRow } from "./interfaces/ranked-id-page";

export function rankedIdPageFromWindowedRows(
  rows: RankedIdPageRow[],
  requestedPage: number,
): RankedIdPage | null {
  if (rows.length > 0) {
    return {
      rowIds: rows.map((row) => Number(row.id)),
      total: Number(rows[0].total),
      page: requestedPage,
    };
  }
  return requestedPage === 1 ? { rowIds: [], total: 0, page: 1 } : null;
}

export function clampRequestedPage(
  requestedPage: number,
  total: number,
  pageSize: number,
): number {
  return Math.min(requestedPage, Math.max(Math.ceil(total / pageSize), 1));
}

async function selectRankedIds(
  tx: Transaction,
  rankedCte: SQL,
  pageSize: number,
  page: number,
): Promise<RankedIdPageRow[]> {
  const result = await tx.execute(sql`
    WITH ${rankedCte}
    SELECT id, count(*) OVER ()::int AS total FROM ranked ORDER BY rn
    LIMIT ${pageSize}::int OFFSET ${(page - 1) * pageSize}::int
  `);
  return result.rows as unknown as RankedIdPageRow[];
}

export async function loadRankedIdPage(
  tx: Transaction,
  rankedCte: SQL,
  pageSize: number,
  requestedPage: number,
): Promise<RankedIdPage> {
  const requestedRows = await selectRankedIds(tx, rankedCte, pageSize, requestedPage);
  const requested = rankedIdPageFromWindowedRows(requestedRows, requestedPage);
  if (requested) return requested;
  const counted = await tx.execute(sql`
    WITH ${rankedCte} SELECT count(*)::int AS total FROM ranked
  `);
  const total = Number(
    (counted.rows[0] as unknown as { total: number } | undefined)?.total ?? 0,
  );
  const page = clampRequestedPage(requestedPage, total, pageSize);
  if (total === 0) return { rowIds: [], total, page };
  const clampedRows = await selectRankedIds(tx, rankedCte, pageSize, page);
  return {
    rowIds: clampedRows.map((row) => Number(row.id)),
    total,
    page,
  };
}
