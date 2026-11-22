import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCardGridTiles,
  type InlineUnmatchedCard,
  type ScannedCard,
} from "@magic-vault/shared";

const card = (scanId: string, scannedAt: number) =>
  ({ scanId, scannedAt }) as unknown as ScannedCard;

const unmatched = (scanId: string, scannedAt: number, position: number): InlineUnmatchedCard => ({
  scanId,
  scannedAt,
  position,
});

const describeTiles = (tiles: ReturnType<typeof buildCardGridTiles>) =>
  tiles.map((tile) =>
    tile.kind === "moreUnmatched" ? `more:${tile.hiddenCount}@${tile.position}` : `${tile.kind}:${tile.entry.scanId}`,
  );

test("unmatched scans sit between cards by scan time, newest first", () => {
  const tiles = buildCardGridTiles(
    [card("a", 500), card("b", 300), card("c", 100)],
    { items: [unmatched("u1", 600, 0), unmatched("u2", 300, 1), unmatched("u3", 200, 2)], totalInPage: 3 },
  );
  assert.deepEqual(describeTiles(tiles), [
    "unmatched:u1",
    "card:a",
    "unmatched:u2",
    "card:b",
    "unmatched:u3",
    "card:c",
  ]);
});

test("unmatched scans older than every card go last, with a tile for the ones left out", () => {
  const tiles = buildCardGridTiles([card("a", 500)], {
    items: [unmatched("u1", 50, 4), unmatched("u2", 40, 5)],
    totalInPage: 7,
  });
  assert.deepEqual(describeTiles(tiles), ["card:a", "unmatched:u1", "unmatched:u2", "more:5@6"]);
});

test("without unmatched scans the grid is just the cards", () => {
  assert.deepEqual(describeTiles(buildCardGridTiles([card("a", 1)], undefined)), ["card:a"]);
});
