import {
  PRINTING_MARK_VERSION,
  printingRegionsOf,
  type BrowserSyncPrintingMarkResult,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import type { SyncSource, SyncSourceCard } from "../interfaces/card-search";
import type { CatalogPrintingMarks, PrintingMarkBatch } from "../interfaces/printing-marks";
import {
  catalogPrintingMarkGroups,
  persistPrintingMarkBatch,
  printingMarkColumns,
} from "../printing-marks/catalog";

let printingMarkWrites: Promise<unknown> = Promise.resolve();

export function oneMarkWriteAtATime<T>(write: () => Promise<T>): Promise<T> {
  const next = printingMarkWrites.then(write, write);
  printingMarkWrites = next.catch(() => undefined);
  return next;
}

export function printingMarksFromBrowser(
  source: SyncSource,
  lang: string,
  card: SyncSourceCard,
  result: BrowserSyncPrintingMarkResult,
): CatalogPrintingMarks {
  if (result.version !== PRINTING_MARK_VERSION) {
    throw new Error("Printing mark version changed. Reload the admin page.");
  }
  const regions = printingRegionsOf(source.gameKey);
  if (!Array.isArray(result.grids) || result.grids.length !== regions.length) {
    throw new Error("Printing mark regions are missing.");
  }
  const gridsByRegion = new Map<string, Float32Array>();
  for (const region of regions) {
    const grid = result.grids.find((grid) => grid?.key === region.key);
    if (
      !grid ||
      !Array.isArray(grid.values) ||
      grid.values.length !== region.gridWidth * region.gridHeight ||
      !grid.values.every((value) => Number.isFinite(value) && value >= 0 && value <= 255)
    ) {
      throw new Error(`Invalid printing mark grid: ${region.key}.`);
    }
    gridsByRegion.set(region.key, Float32Array.from(grid.values));
  }
  // Groups belong to the catalog, never to client-supplied data.
  const groups = catalogPrintingMarkGroups(
    source.gameKey, lang, card.id, JSON.parse(card.data),
  );
  if (!groups || Object.keys(groups).length === 0) {
    return { groups: null, gridsByRegion: new Map() };
  }
  return { groups, gridsByRegion };
}

export async function storePrintingMarks(
  source: SyncSource,
  lang: string,
  cards: { cardId: string; marks: CatalogPrintingMarks | null }[],
  batch: PrintingMarkBatch,
): Promise<void> {
  const rows = JSON.stringify(
    cards.map(({ cardId, marks }) => ({
      card_id: cardId,
      ...printingMarkColumns(source.gameKey, marks),
    })),
  );
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE cards AS c
      SET printing_mark_groups = x."printingMarkGroups",
        printing_mark_version = x."printingMarkVersion"
      FROM jsonb_to_recordset(${rows}::jsonb)
        AS x(card_id text, "printingMarkGroups" jsonb, "printingMarkVersion" smallint)
      WHERE c.game_key = ${source.gameKey}
        AND c.lang = ${lang}
        AND c.card_id = x.card_id
    `);
    await persistPrintingMarkBatch(tx, source.gameKey, batch);
  });
}
