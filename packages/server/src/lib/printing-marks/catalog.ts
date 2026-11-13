import {
  catalogPrintingMarkGrids,
  printingRegionsOf,
  type PrintingMarkGroups,
} from "@magic-vault/shared";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, type Transaction } from "../../db";
import { cardImageVectors, printingMarkReferences } from "../../db/schema";
import { resolveCardSearchForGame } from "../card-search/resolve";
import { PRINTING_MARK_VERSION } from "../constants/printing-marks";
import type {
  CatalogPrintingMarks,
  PrintingMarkBatch,
  PrintingMarkColumns,
} from "../interfaces/printing-marks";
import { rgbaFromImageBuffer } from "./decode";

export function gameUsesPrintingMarks(gameKey: string): boolean {
  return printingRegionsOf(gameKey).length > 0;
}

export async function readCatalogPrintingMarks(
  gameKey: string,
  lang: string,
  cardId: string,
  data: unknown,
  imageBuffer: Buffer,
): Promise<CatalogPrintingMarks | null> {
  if (!gameUsesPrintingMarks(gameKey)) return null;
  const adapter = resolveCardSearchForGame(gameKey, lang)?.adapter;
  const card = adapter?.normalizeStored(data, cardId, lang);
  const groups = card && adapter?.printingMarkGroups?.(card);
  if (!groups || Object.keys(groups).length === 0) {
    return { groups: null, gridsByRegion: new Map() };
  }
  const image = await rgbaFromImageBuffer(imageBuffer);
  const gridsByRegion = new Map(
    catalogPrintingMarkGrids(image, gameKey).map((grid) => [
      grid.region.key,
      grid.values,
    ]),
  );
  return { groups, gridsByRegion };
}

export function printingMarkColumns(
  gameKey: string,
  marks: CatalogPrintingMarks | null,
): PrintingMarkColumns {
  return gameUsesPrintingMarks(gameKey) && marks
    ? {
        printingMarkGroups: marks.groups,
        printingMarkVersion: PRINTING_MARK_VERSION,
      }
    : { printingMarkGroups: null, printingMarkVersion: null };
}

export function addToPrintingMarkBatch(
  batch: PrintingMarkBatch,
  marks: CatalogPrintingMarks | null,
): void {
  if (!marks?.groups) return;
  for (const [regionKey, values] of marks.gridsByRegion) {
    const groupKey = marks.groups[regionKey as keyof PrintingMarkGroups];
    if (!groupKey) continue;
    const key = `${regionKey}\u0000${groupKey}`;
    let entry = batch.get(key);
    if (!entry) {
      entry = {
        regionKey,
        groupKey,
        cardCount: 0,
        sums: new Float64Array(values.length),
        squares: new Float64Array(values.length),
      };
      batch.set(key, entry);
    }
    entry.cardCount++;
    for (let i = 0; i < values.length; i++) {
      entry.sums[i] += values[i];
      entry.squares[i] += values[i] * values[i];
    }
  }
}

export async function persistPrintingMarkBatch(
  tx: Transaction,
  gameKey: string,
  batch: PrintingMarkBatch,
): Promise<void> {
  const entriesInLockOrder = [...batch.values()].sort(
    (a, b) =>
      a.regionKey.localeCompare(b.regionKey) ||
      a.groupKey.localeCompare(b.groupKey),
  );
  if (entriesInLockOrder.length === 0) return;
  const rows = entriesInLockOrder.map(
    (entry) => sql`(
      ${gameKey}, ${entry.regionKey}, ${entry.groupKey}, ${entry.cardCount},
      ${`{${Array.from(entry.sums).join(",")}}`}::real[],
      ${`{${Array.from(entry.squares).join(",")}}`}::real[],
      ${PRINTING_MARK_VERSION}::smallint, now()
    )`,
  );
  await tx.execute(sql`
    INSERT INTO printing_mark_references AS r
      (game_key, region_key, group_key, card_count, sums, squares, version, updated_at)
    VALUES ${sql.join(rows, sql`, `)}
    ON CONFLICT (game_key, region_key, group_key) DO UPDATE SET
      card_count = r.card_count + excluded.card_count,
      sums = (
        SELECT array_agg(a + b ORDER BY i)
        FROM unnest(r.sums, excluded.sums) WITH ORDINALITY AS t(a, b, i)
      ),
      squares = (
        SELECT array_agg(a + b ORDER BY i)
        FROM unnest(r.squares, excluded.squares) WITH ORDINALITY AS t(a, b, i)
      ),
      version = excluded.version,
      updated_at = now()
  `);
}

export async function dropOutdatedPrintingMarkReferences(
  gameKey: string,
): Promise<void> {
  await db
    .delete(printingMarkReferences)
    .where(
      and(
        eq(printingMarkReferences.gameKey, gameKey),
        ne(printingMarkReferences.version, PRINTING_MARK_VERSION),
      ),
    );
}

export async function cardIdsWithCurrentPrintingMarks(
  gameKey: string,
  lang: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ cardId: cardImageVectors.cardId })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, lang),
        eq(cardImageVectors.printingMarkVersion, PRINTING_MARK_VERSION),
      ),
    );
  return new Set(rows.map((row) => row.cardId));
}
