import assert from "node:assert/strict";
import { test } from "node:test";
import {
  catalogPrintingMarkGrids,
  PRINTING_MARK_VERSION,
  type BrowserSyncPrintingMarkResult,
  type RgbaImage,
} from "@magic-vault/shared";
import sharp from "sharp";
import { printingMarksFromBrowser } from "../src/lib/sync-job/printing-marks";
import { readCatalogPrintingMarks } from "../src/lib/printing-marks/catalog";
import type { SyncSource, SyncSourceCard } from "../src/lib/interfaces/card-search";

const source = { gameKey: "mtg" } as SyncSource;
const card = {
  id: "list-card", data: JSON.stringify({ set: "plst", frame: "2015", prices: {} }),
} as SyncSourceCard;

function pixels(): RgbaImage {
  const width = 488, height = 680;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (i / 4) % 256;
    data[i + 1] = (i / 8) % 256;
    data[i + 2] = 50;
    data[i + 3] = 255;
  }
  return { width, height, data };
}

function result(image = pixels()): BrowserSyncPrintingMarkResult {
  return {
    kind: "printingMarks", cardId: card.id, version: PRINTING_MARK_VERSION,
    grids: catalogPrintingMarkGrids(image, "mtg").map(({ region, values }) => ({
      key: region.key, values: Array.from(values),
    })),
  };
}

test("browser catalog grids produce the same reference data as server image decoding", async () => {
  const image = pixels();
  const buffer = await sharp(Buffer.from(image.data), {
    raw: { width: image.width, height: image.height, channels: 4 },
  }).png().toBuffer();
  const browser = printingMarksFromBrowser(source, "en", card, result(image));
  const server = await readCatalogPrintingMarks("mtg", "en", card.id, JSON.parse(card.data), buffer);
  assert.deepEqual(browser, server);
  assert.deepEqual(browser.groups, { listIcon: "list|2015" });
});

test("browser printing marks reject stale versions, missing regions and invalid cell values", () => {
  const stale = { ...result(), version: PRINTING_MARK_VERSION - 1 };
  assert.throws(() => printingMarksFromBrowser(source, "en", card, stale), /version/);
  assert.throws(() => printingMarksFromBrowser(source, "en", card, { ...result(), grids: [] }), /missing/);
  for (const value of [-1, 256, Infinity, NaN]) {
    const invalid = result();
    invalid.grids[0].values[0] = value;
    assert.throws(() => printingMarksFromBrowser(source, "en", card, invalid), /Invalid/);
  }
  const truncated = result();
  truncated.grids[0].values.pop();
  assert.throws(() => printingMarksFromBrowser(source, "en", card, truncated), /Invalid/);
});
