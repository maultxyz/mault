import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addToPrintingMarkAccumulator,
  catalogPrintingMarkGrids,
  decodePrintingMarkGrids,
  emptyPrintingMarkAccumulator,
  encodePrintingMarkGrids,
  printingMarkEvidence,
  printingMarkReferenceOf,
  printingRegionsOf,
  scanPrintingMarkGrids,
  wholeImageHomography,
  type PlayingCard,
  type PrintingMarkReference,
  type RgbaImage,
} from "@magic-vault/shared";
import { readRiftboundPromoMarker } from "../src/lib/card-search/printed-markers";
import {
  buildCardMatchSegment,
  printingMarkGroupsOfRow,
} from "../src/lib/card-match-search";
import { MILO_EMBEDDING_DIM } from "../src/lib/constants/card-search";
import { scryfallPrintingMarkGroups } from "../src/lib/printing-marks/groups";
import { rankByPrintingMarks } from "../src/lib/printing-marks/ranking";
import type { PrintingMarkReferenceSet } from "../src/lib/interfaces/printing-marks";

const WIDTH = 488;
const HEIGHT = 680;

function seededNoise(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function card(seed: number, listIcon: boolean): RgbaImage {
  const random = seededNoise(seed);
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const offset = (y * WIDTH + x) * 4;
      const isBorder = y > HEIGHT * 0.93 || x < WIDTH * 0.04;
      const value = isBorder ? 10 : Math.floor(random() * 255);
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  if (listIcon) {
    for (let y = Math.round(HEIGHT * 0.955); y < HEIGHT * 0.972; y++) {
      for (let x = Math.round(WIDTH * 0.012); x < WIDTH * 0.034; x++) {
        const offset = (y * WIDTH + x) * 4;
        data[offset] = 240;
        data[offset + 1] = 240;
        data[offset + 2] = 240;
      }
    }
  }
  return { width: WIDTH, height: HEIGHT, data };
}

function listIconReference(listIcon: boolean): PrintingMarkReference | null {
  const region = printingRegionsOf("mtg").find((r) => r.key === "listIcon")!;
  const accumulator = emptyPrintingMarkAccumulator(
    region.gridWidth * region.gridHeight,
  );
  for (let seed = 1; seed <= 6; seed++) {
    const grid = catalogPrintingMarkGrids(card(seed, listIcon), "mtg").find(
      (g) => g.region.key === "listIcon",
    )!;
    addToPrintingMarkAccumulator(accumulator, grid.values);
  }
  return printingMarkReferenceOf(accumulator);
}

function scanGrid(image: RgbaImage) {
  return scanPrintingMarkGrids(
    image,
    wholeImageHomography(image),
    "mtg",
    "upright",
  )!.grids.find((g) => g.region.key === "listIcon")!;
}

test("printing mark grids survive the trip to the server", () => {
  const image = card(3, true);
  const grids = scanPrintingMarkGrids(
    image,
    wholeImageHomography(image),
    "mtg",
    "upright",
  )!;
  const decoded = decodePrintingMarkGrids(
    encodePrintingMarkGrids(grids),
    "mtg",
  );
  assert.ok(decoded);
  assert.equal(decoded.grids.length, grids.grids.length);
  decoded.grids.forEach((grid, index) => {
    assert.equal(grid.values.length, grids.grids[index].values.length);
    assert.ok(Math.abs(grid.values[0] - grids.grids[index].values[0]) <= 0.5);
  });
  assert.equal(
    decodePrintingMarkGrids(encodePrintingMarkGrids(grids), "pokemon"),
    null,
  );
  assert.equal(decodePrintingMarkGrids("not base64!", "mtg"), null);
});

test("pairwise evidence favors the printing whose mark the scan shows", () => {
  const withIcon = listIconReference(true);
  const withoutIcon = listIconReference(false);
  assert.ok(withIcon && withoutIcon);
  const listScan = scanGrid(card(99, true));
  const plainScan = scanGrid(card(98, false));
  assert.ok(printingMarkEvidence(listScan, withIcon, withoutIcon) > 0.5);
  assert.ok(printingMarkEvidence(plainScan, withIcon, withoutIcon) < -0.5);
  assert.equal(printingMarkEvidence(listScan, withIcon, withIcon), 0);
});

test("a mark only one printing has is judged by whether the scan shows it", () => {
  const withIcon = listIconReference(true);
  assert.ok(withIcon);
  assert.equal(
    printingMarkEvidence(scanGrid(card(99, true)), withIcon, "absent"),
    1,
  );
  assert.equal(
    printingMarkEvidence(scanGrid(card(99, true)), "absent", withIcon),
    -1,
  );
  assert.equal(
    printingMarkEvidence(scanGrid(card(99, true)), withIcon, null),
    0,
  );
});

test("ranking only reorders printings when the marks clearly disagree with the leader", () => {
  const withIcon = listIconReference(true)!;
  const withoutIcon = listIconReference(false)!;
  const references: PrintingMarkReferenceSet = {
    version: "test",
    byRegion: new Map([
      [
        "listIcon",
        new Map([
          ["list", withIcon],
          ["plain", withoutIcon],
        ]),
      ],
    ]),
  };
  const image = card(99, true);
  const grids = scanPrintingMarkGrids(
    image,
    wholeImageHomography(image),
    "mtg",
    "upright",
  );
  const ranking = rankByPrintingMarks(grids, references, [
    { cardId: "clb-187", groups: { listIcon: "plain" } },
    { cardId: "plst-clb-187", groups: { listIcon: "list" } },
  ]);
  assert.equal(ranking.winnerCardId, "plst-clb-187");
  assert.equal(ranking.diagnostics.replacedCardId, "clb-187");
  assert.equal(ranking.diagnostics.confirmed, true);

  const plain = card(98, false);
  const plainRanking = rankByPrintingMarks(
    scanPrintingMarkGrids(plain, wholeImageHomography(plain), "mtg", "upright"),
    references,
    [
      { cardId: "clb-187", groups: { listIcon: "plain" } },
      { cardId: "plst-clb-187", groups: { listIcon: "list" } },
    ],
  );
  assert.equal(plainRanking.winnerCardId, null);
  assert.ok((plainRanking.evidenceByCardId.get("plst-clb-187") ?? 0) < 0);
});

test("the match index keeps each card's printing mark groups", () => {
  const segment = buildCardMatchSegment("mtg", "en", [
    {
      cardId: "a",
      name: "A",
      setCode: "sos",
      collectorNumber: "1",
      rarePrinting: false,
      promoPrinting: false,
      printingMarkGroups: { listIcon: "plain" },
      embedding: new Float32Array(MILO_EMBEDDING_DIM).fill(1),
      backEmbedding: null,
    },
    {
      cardId: "b",
      name: "A",
      setCode: "psos",
      collectorNumber: "1p",
      rarePrinting: true,
      promoPrinting: false,
      printingMarkGroups: null,
      embedding: new Float32Array(MILO_EMBEDDING_DIM).fill(1),
      backEmbedding: null,
    },
  ]);
  assert.deepEqual(printingMarkGroupsOfRow(segment, 0), {
    listIcon: "plain",
  });
  assert.equal(printingMarkGroupsOfRow(segment, 1), null);
});

test("MTG printing marks only tell List reprints apart", () => {
  const groupsOf = (raw: Record<string, unknown>) =>
    scryfallPrintingMarkGroups({ raw } as unknown as PlayingCard);
  const base = {
    rarity: "rare",
    frame: "2015",
    border_color: "black",
    collector_number: "113",
  };
  assert.deepEqual(groupsOf({ ...base, set: "sos" }), {
    listIcon: "plain|2015|black",
  });
  assert.deepEqual(
    groupsOf({ ...base, set: "plst", collector_number: "CLB-187" }),
    { listIcon: "list|2015" },
  );
});

test("a Riftbound P after the collector number marks a promo", () => {
  assert.equal(readRiftboundPromoMarker("SFD • 086/221 • P"), true);
  assert.equal(readRiftboundPromoMarker("UNL 100/219 P"), true);
  assert.equal(readRiftboundPromoMarker("UNL • 100/219"), false);
  assert.equal(
    readRiftboundPromoMarker("UNL • 100/219 / Polar Engine Studio"),
    false,
  );
  assert.equal(readRiftboundPromoMarker("Polar Engine Studio"), null);
});
