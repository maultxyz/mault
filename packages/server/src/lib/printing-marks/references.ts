import {
  printingMarkReferenceOf,
  printingRegionsOf,
  type PrintingMarkAccumulator,
  type PrintingMarkCandidateReference,
  type PrintingMarkGroups,
  type PrintingMarkReference,
  type PrintingRegion,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { printingMarkReferences } from "../../db/schema";
import {
  PRINTING_MARK_REFERENCES_REVALIDATE_MS,
  PRINTING_MARK_VERSION,
} from "../constants/printing-marks";
import type {
  PrintingMarkReferenceEntry,
  PrintingMarkReferenceSet,
} from "../interfaces/printing-marks";

const entries = new Map<string, PrintingMarkReferenceEntry>();

export function accumulatorFromRow(row: {
  cardCount: number;
  sums: number[];
  squares: number[];
}): PrintingMarkAccumulator {
  return {
    cardCount: row.cardCount,
    sums: Float64Array.from(row.sums),
    squares: Float64Array.from(row.squares),
  };
}

async function referenceSignature(gameKey: string): Promise<string> {
  const result = await db.execute<{
    row_count: number;
    last_updated: string;
  }>(sql`
    SELECT count(*)::int AS row_count, coalesce(max(updated_at)::text, '') AS last_updated
    FROM printing_mark_references
    WHERE game_key = ${gameKey} AND version = ${PRINTING_MARK_VERSION}
  `);
  const [row] = result.rows;
  return `${row.row_count}|${row.last_updated}`;
}

async function loadReferences(
  gameKey: string,
): Promise<PrintingMarkReferenceSet> {
  const version = await referenceSignature(gameKey);
  const regions = new Map<string, PrintingRegion>(
    printingRegionsOf(gameKey).map((region) => [region.key, region]),
  );
  const rows = await db
    .select({
      regionKey: printingMarkReferences.regionKey,
      groupKey: printingMarkReferences.groupKey,
      cardCount: printingMarkReferences.cardCount,
      sums: printingMarkReferences.sums,
      squares: printingMarkReferences.squares,
    })
    .from(printingMarkReferences)
    .where(
      and(
        eq(printingMarkReferences.gameKey, gameKey),
        eq(printingMarkReferences.version, PRINTING_MARK_VERSION),
      ),
    );
  const byRegion = new Map<string, Map<string, PrintingMarkReference | null>>();
  for (const row of rows) {
    const region = regions.get(row.regionKey);
    if (!region) continue;
    const accumulator = accumulatorFromRow(row);
    if (accumulator.sums.length !== region.gridWidth * region.gridHeight)
      continue;
    const groups = byRegion.get(row.regionKey) ?? new Map();
    groups.set(row.groupKey, printingMarkReferenceOf(accumulator));
    byRegion.set(row.regionKey, groups);
  }
  return { version, byRegion };
}

function entryFor(gameKey: string): PrintingMarkReferenceEntry {
  let entry = entries.get(gameKey);
  if (!entry) {
    entry = { gameKey, references: null, loading: null, checkedAt: 0 };
    entries.set(gameKey, entry);
  }
  return entry;
}

function reload(
  entry: PrintingMarkReferenceEntry,
): Promise<PrintingMarkReferenceSet> {
  if (entry.loading) return entry.loading;
  entry.checkedAt = Date.now();
  entry.loading = loadReferences(entry.gameKey)
    .then((references) => {
      entry.references = references;
      return references;
    })
    .finally(() => {
      entry.loading = null;
    });
  return entry.loading;
}

function revalidateInBackground(entry: PrintingMarkReferenceEntry): void {
  if (
    entry.loading ||
    Date.now() - entry.checkedAt < PRINTING_MARK_REFERENCES_REVALIDATE_MS
  ) {
    return;
  }
  entry.checkedAt = Date.now();
  referenceSignature(entry.gameKey)
    .then((signature) =>
      signature === entry.references?.version ? undefined : reload(entry),
    )
    .catch((err) =>
      console.error(
        `[printing-marks] failed to revalidate ${entry.gameKey}:`,
        err,
      ),
    );
}

export async function printingMarkReferencesFor(
  gameKey: string,
): Promise<PrintingMarkReferenceSet | null> {
  if (printingRegionsOf(gameKey).length === 0) return null;
  const entry = entryFor(gameKey);
  if (entry.references) {
    revalidateInBackground(entry);
    return entry.references;
  }
  return reload(entry);
}

export function invalidatePrintingMarkReferences(gameKey?: string): void {
  for (const entry of entries.values()) {
    if (gameKey === undefined || entry.gameKey === gameKey) {
      reload(entry).catch((err) =>
        console.error(
          `[printing-marks] failed to reload ${entry.gameKey}:`,
          err,
        ),
      );
    }
  }
}

export function candidateReference(
  references: PrintingMarkReferenceSet,
  regionKey: string,
  groups: PrintingMarkGroups | null,
): PrintingMarkCandidateReference {
  if (!groups) return null;
  const groupKey = groups[regionKey as keyof PrintingMarkGroups];
  if (!groupKey) return "absent";
  return references.byRegion.get(regionKey)?.get(groupKey) ?? null;
}
