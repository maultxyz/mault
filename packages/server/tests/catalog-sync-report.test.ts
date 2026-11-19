import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCatalogSyncReport } from "../src/lib/catalog-sync-report";
import type { CatalogSyncResult } from "../src/lib/interfaces/catalog-sync-report";

function catalogResult(overrides: Partial<CatalogSyncResult>): CatalogSyncResult {
  return {
    gameKey: "mtg",
    lang: "en",
    succeeded: true,
    newCards: 0,
    updatedCards: 0,
    ...overrides,
  };
}

const reportOptions = {
  forceResync: false,
  timestamp: "2026-11-09T17:28:12.000Z",
  runUrl: "https://github.com/example/mault/actions/runs/1",
};

test("every catalog gets one line with its game, language and counts", () => {
  const report = buildCatalogSyncReport(
    [
      catalogResult({ gameKey: "mtg", newCards: 12, updatedCards: 3 }),
      catalogResult({ gameKey: "gundam" }),
      catalogResult({ gameKey: "riftbound", succeeded: false }),
      catalogResult({ gameKey: "pokemon", lang: "de", updatedCards: 40 }),
      catalogResult({ gameKey: "fab", removedCards: 2 }),
    ],
    reportOptions,
  );

  const [embed] = report.embeds;
  assert.equal(embed.title, "Card catalog sync");
  assert.equal(embed.url, reportOptions.runUrl);
  assert.equal(embed.fields, undefined);
  assert.equal(embed.color, 0xfee75c);
  assert.equal(
    embed.description,
    [
      "**mtg** (en): 12 new, 3 updated",
      "**gundam** (en): no changes",
      "**riftbound** (en): failed",
      "**pokemon** (de): 0 new, 40 updated",
      "**fab** (en): 0 new, 0 updated, 2 removed",
    ].join("\n"),
  );
});

test("forty catalogs all fit in the report", () => {
  const report = buildCatalogSyncReport(
    Array.from({ length: 40 }, (_, index) =>
      catalogResult({ gameKey: `game${index}`, newCards: 1000, updatedCards: 100000 }),
    ),
    reportOptions,
  );
  const [embed] = report.embeds;
  assert.match(embed.description ?? "", /\*\*game39\*\* \(en\): 1000 new, 100000 updated$/);
  assert.ok((embed.description ?? "").length <= 4096);
});
