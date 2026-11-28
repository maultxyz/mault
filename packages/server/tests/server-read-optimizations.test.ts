import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import type { PlayingCard } from "@magic-vault/shared";
import {
  clearVerifiedLocalTokens,
  verifyLocalTokenThroughCache,
} from "../src/auth/local-token-cache";
import { catalogCardKey } from "../src/lib/card-catalog";
import {
  buildGroupedCardRanking,
  groupedCardPageRows,
  groupedCardRankingPage,
} from "../src/lib/grouped-card-ranking";
import type {
  GroupedCardRankingRow,
  GroupedCardRepresentativeRow,
} from "../src/lib/interfaces/collections";
import {
  createOrgReadCache,
  invalidateOrgCardReadCaches,
  invalidateOrgReadCaches,
  invalidateOrgReadCachesForEvent,
} from "../src/lib/org-read-cache";
import { hydrateSavedScansFromCatalog } from "../src/lib/saved-cards";
import { toScanSaveContext } from "../src/lib/scan-save-context";
import {
  emitToSession,
  serializeSseDataOnce,
  subscribeSession,
} from "../src/lib/session-stream";
import { parseOwnerTradeOffersPage } from "../src/lib/trade-offers";
import { markRequestAsCardWrite, type AppEnv } from "../src/middleware/auth";

function countingLoader() {
  let loadCount = 0;
  return {
    load: async () => {
      loadCount += 1;
      return { loadCount };
    },
    loadCount: () => loadCount,
  };
}

test("card writes invalidate card caches and leave settings caches cached", async () => {
  const cardCache = createOrgReadCache<{ loadCount: number }>("test.orgRead", 60_000, 10);
  const settingsCache = createOrgReadCache<{ loadCount: number }>("test.orgRead", 60_000, 10, 0, {
    isUnaffectedByCardWrites: true,
  });
  const cardLoader = countingLoader();
  const settingsLoader = countingLoader();
  await cardCache.get("org-scope-a", "list", cardLoader.load);
  await settingsCache.get("org-scope-a", "plan", settingsLoader.load);

  invalidateOrgCardReadCaches("org-scope-a");
  await cardCache.get("org-scope-a", "list", cardLoader.load);
  await settingsCache.get("org-scope-a", "plan", settingsLoader.load);
  assert.equal(cardLoader.loadCount(), 2);
  assert.equal(settingsLoader.loadCount(), 1);

  invalidateOrgReadCaches("org-scope-a");
  await cardCache.get("org-scope-a", "list", cardLoader.load);
  await settingsCache.get("org-scope-a", "plan", settingsLoader.load);
  assert.equal(cardLoader.loadCount(), 3);
  assert.equal(settingsLoader.loadCount(), 2);
});

test("collections_changed only invalidates card caches while other data events invalidate everything", async () => {
  const cardCache = createOrgReadCache<{ loadCount: number }>("test.orgRead", 60_000, 10);
  const settingsCache = createOrgReadCache<{ loadCount: number }>("test.orgRead", 60_000, 10, 0, {
    isUnaffectedByCardWrites: true,
  });
  const cardLoader = countingLoader();
  const settingsLoader = countingLoader();
  await cardCache.get("org-scope-b", "list", cardLoader.load);
  await settingsCache.get("org-scope-b", "plan", settingsLoader.load);

  invalidateOrgReadCachesForEvent("org-scope-b", "collections_changed");
  await cardCache.get("org-scope-b", "list", cardLoader.load);
  await settingsCache.get("org-scope-b", "plan", settingsLoader.load);
  assert.equal(cardLoader.loadCount(), 2);
  assert.equal(settingsLoader.loadCount(), 1);

  invalidateOrgReadCachesForEvent("org-scope-b", "orders_changed");
  await settingsCache.get("org-scope-b", "plan", settingsLoader.load);
  assert.equal(settingsLoader.loadCount(), 2);
});

test("markRequestAsCardWrite flags the request for requireOrg", async () => {
  const app = new Hono<AppEnv>()
    .post("/marked", markRequestAsCardWrite, (c) =>
      c.json({ cardsOnly: c.get("invalidatesOnlyOrgCardReadCaches") === true }),
    )
    .post("/unmarked", (c) =>
      c.json({ cardsOnly: c.get("invalidatesOnlyOrgCardReadCaches") === true }),
    );
  const marked = (await (await app.request("/marked", { method: "POST" })).json()) as { cardsOnly: boolean };
  const unmarked = (await (await app.request("/unmarked", { method: "POST" })).json()) as { cardsOnly: boolean };
  assert.equal(marked.cardsOnly, true);
  assert.equal(unmarked.cardsOnly, false);
});

const rankingRows: GroupedCardRankingRow[] = [
  { row_id: 50, is_stored: true, entry_rank: 1 },
  { row_id: 40, is_stored: false, entry_rank: 2 },
  { row_id: 30, is_stored: false, entry_rank: 1 },
  { row_id: 20, is_stored: true, entry_rank: 4 },
  { row_id: 10, is_stored: true, entry_rank: 2 },
  { row_id: 5, is_stored: true, entry_rank: 1 },
];

test("a grouped ranking keeps entries in first-appearance order with members in rank order", () => {
  const ranking = buildGroupedCardRanking(rankingRows);
  const firstPage = groupedCardRankingPage(ranking, 0, 2);
  assert.equal(firstPage.totalEntries, 3);
  assert.equal(firstPage.totalCards, 6);
  assert.deepEqual(firstPage.entries, [
    { representativeRowId: 50, memberRowIds: [50, 30, 5], storedCount: 2 },
    { representativeRowId: 40, memberRowIds: [40, 10], storedCount: 1 },
  ]);
  assert.deepEqual(groupedCardRankingPage(ranking, 1, 2).entries, [
    { representativeRowId: 20, memberRowIds: [20], storedCount: 1 },
  ]);
  const pastTheEnd = groupedCardRankingPage(ranking, 5, 2);
  assert.deepEqual(pastTheEnd.entries, []);
  assert.equal(pastTheEnd.totalEntries, 3);
  assert.equal(pastTheEnd.totalCards, 6);
});

test("an empty grouped ranking pages to nothing", () => {
  const page = groupedCardRankingPage(buildGroupedCardRanking([]), 0, 50);
  assert.deepEqual(page, { entries: [], totalEntries: 0, totalCards: 0 });
});

function representativeRow(rowId: number, guid: string): GroupedCardRepresentativeRow {
  return {
    row_id: rowId,
    guid,
    card: { id: `card-${rowId}` },
    scanned_at_ms: 0,
    bin_number: null,
    is_foil: false,
    foil_type: null,
    stamp: null,
    condition: "NM",
    language: null,
    is_downloaded: false,
    alternative_matches: null,
    is_corrected: false,
    low_confidence_match: false,
    is_reviewed: false,
  };
}

test("grouped page rows follow the ranking and drop cards deleted since it was cached", () => {
  const page = groupedCardRankingPage(buildGroupedCardRanking(rankingRows), 0, 3);
  const rows = groupedCardPageRows(
    page,
    [representativeRow(40, "scan-40"), representativeRow(50, "scan-50")],
    [
      { row_id: 5, guid: "scan-5" },
      { row_id: 10, guid: "scan-10" },
    ],
  );
  assert.deepEqual(
    rows.map((row) => ({
      guid: row.guid,
      scanIds: row.scan_ids,
      quantity: row.quantity,
      storedCount: row.stored_count,
    })),
    [
      { guid: "scan-50", scanIds: ["scan-50", "scan-5"], quantity: 2, storedCount: 2 },
      { guid: "scan-40", scanIds: ["scan-40", "scan-10"], quantity: 2, storedCount: 1 },
    ],
  );
  assert.equal("row_id" in rows[0], false);
});

test("rawCardData mainOnly keeps raw on the main card and drops it from alternatives", () => {
  const scope = { gameKey: "mtg", lang: "en" };
  const catalogCard = (id: string) =>
    ({ id, name: id, raw: { source: id } }) as unknown as PlayingCard;
  const catalog = new Map(
    ["main", "alternative"].map((id) => [
      catalogCardKey({ gameKey: "mtg", lang: "en", cardId: id }),
      catalogCard(id),
    ]),
  );
  const scans = [
    {
      card: { id: "main", lang: "en" } as PlayingCard,
      alternativeMatches: [
        { id: "alternative", lang: "en" } as PlayingCard,
        { id: "gone", lang: "en", raw: { source: "saved" } } as unknown as PlayingCard,
      ],
    },
  ];
  const [everything] = hydrateSavedScansFromCatalog(scope, scans, catalog, {
    includeRaw: true,
  });
  assert.deepEqual((everything.card as { raw?: unknown }).raw, { source: "main" });
  assert.deepEqual(
    everything.alternativeMatches?.map((card) => (card as { raw?: unknown }).raw),
    [{ source: "alternative" }, { source: "saved" }],
  );
  const [mainOnly] = hydrateSavedScansFromCatalog(scope, scans, catalog, {
    includeRaw: true,
    includeRawOnAlternativeMatches: false,
  });
  assert.deepEqual((mainOnly.card as { raw?: unknown }).raw, { source: "main" });
  assert.deepEqual(
    mainOnly.alternativeMatches?.map((card) => "raw" in card),
    [false, false],
  );
  assert.equal(mainOnly.alternativeMatches?.[0].name, "alternative");
});

test("session events are serialized once for every viewer", () => {
  let serializations = 0;
  const payload = {
    toJSON() {
      serializations += 1;
      return { scanId: "scan-1" };
    },
  };
  const collectionGuid = "0b0a4a0e-7f0e-4a55-9d57-5e1b0f1a2b3c";
  const received: string[] = [];
  const unsubscribes = ["viewer-a", "viewer-b", "viewer-c"].map((userId) =>
    subscribeSession(
      collectionGuid,
      "org-serialize",
      userId,
      userId,
      (event, data, serializedData) => {
        if (event !== "card_added") return;
        received.push(serializedData?.() ?? JSON.stringify(data));
      },
    ),
  );
  emitToSession("org-serialize", collectionGuid, "card_added", payload);
  for (const unsubscribe of unsubscribes) unsubscribe();
  assert.deepEqual(received, Array(3).fill('{"scanId":"scan-1"}'));
  assert.equal(serializations, 1);
  assert.equal(serializeSseDataOnce({ a: 1 })(), '{"a":1}');
});

test("owner trade offers stay unpaged unless a limit is asked for", () => {
  assert.equal(parseOwnerTradeOffersPage(undefined, undefined), null);
  assert.equal(parseOwnerTradeOffersPage(undefined, "20"), null);
  assert.equal(parseOwnerTradeOffersPage("abc", "0"), null);
  assert.equal(parseOwnerTradeOffersPage("0", "0"), null);
  assert.deepEqual(parseOwnerTradeOffersPage("25", undefined), { limit: 25, offset: 0 });
  assert.deepEqual(parseOwnerTradeOffersPage("25", "50"), { limit: 25, offset: 50 });
  assert.deepEqual(parseOwnerTradeOffersPage("5000", "-3"), { limit: 100, offset: 0 });
});

test("the scan save context maps one row to the values the save needs", () => {
  assert.deepEqual(
    toScanSaveContext({
      collection_id: 7,
      game_id: null,
      collection_name: "Binder",
      collection_lang: "en",
      game_key: null,
      game_name: null,
      scans_today: 12,
      is_already_saved: false,
      scanned_by_device_id: null,
      open_intake_lot_id: 3,
      bin_fill: { height: 50, card_thickness: 0.3, count: 12 },
      resorts_matching_cards: null,
    }),
    {
      collection: {
        id: 7,
        gameId: null,
        name: "Binder",
        lang: "en",
        gameKey: null,
        gameName: null,
      },
      scansToday: 12,
      isAlreadySaved: false,
      scannedByDeviceId: null,
      openIntakeLotId: 3,
      binFill: { height: 50, card_thickness: 0.3, count: 12 },
      resortsMatchingCards: false,
    },
  );
});

test("a verified local token is reused until tokens are cleared, and failures are never cached", async () => {
  clearVerifiedLocalTokens();
  let verifications = 0;
  let isValid = true;
  const verify = async () => {
    verifications += 1;
    return isValid ? { sub: "user-1" } : null;
  };
  assert.deepEqual(await verifyLocalTokenThroughCache("token-a", verify), { sub: "user-1" });
  assert.deepEqual(await verifyLocalTokenThroughCache("token-a", verify), { sub: "user-1" });
  assert.equal(verifications, 1);

  isValid = false;
  clearVerifiedLocalTokens();
  assert.equal(await verifyLocalTokenThroughCache("token-a", verify), null);
  assert.equal(await verifyLocalTokenThroughCache("token-a", verify), null);
  assert.equal(verifications, 3);
});

test("a verification that was in flight when tokens were cleared is not cached", async () => {
  clearVerifiedLocalTokens();
  let verifications = 0;
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const slowVerify = async () => {
    verifications += 1;
    await held;
    return { sub: "user-2" };
  };
  const pending = verifyLocalTokenThroughCache("token-b", slowVerify);
  clearVerifiedLocalTokens();
  release();
  await pending;
  await verifyLocalTokenThroughCache("token-b", async () => {
    verifications += 1;
    return { sub: "user-2" };
  });
  assert.equal(verifications, 2);
});
