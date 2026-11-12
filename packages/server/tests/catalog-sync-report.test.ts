import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCatalogSyncReport } from "../src/lib/catalog-sync-report";
import type { CatalogSyncResult } from "../src/lib/interfaces/catalog-sync-report";

function catalogResult(overrides: Partial<CatalogSyncResult>): CatalogSyncResult {
  return {
    gameKey: "mtg",
    lang: "en",
    succeeded: true,
    totalCards: 100,
    newCards: 0,
    updatedCards: 0,
    newCardNames: [],
    cardErrors: 0,
    cardErrorSamples: [],
    fatalError: null,
    durationMs: 65_000,
    ...overrides,
  };
}

const reportOptions = {
  forceResync: false,
  timestamp: "2026-11-09T17:28:12.000Z",
  runUrl: "https://github.com/example/mault/actions/runs/1",
};

test("a failed catalog is listed with its error while the rest still report", () => {
  const report = buildCatalogSyncReport(
    [
      catalogResult({
        gameKey: "mtg",
        newCards: 12,
        updatedCards: 3,
        newCardNames: ["Lightning Bolt (abc)", "Counterspell (abc)"],
      }),
      catalogResult({ gameKey: "gundam" }),
      catalogResult({
        gameKey: "riftbound",
        succeeded: false,
        fatalError: "Riftcodex card list fetch failed: 502",
      }),
      catalogResult({
        gameKey: "sorcery",
        cardErrors: 6,
        cardErrorSamples: ["Error: Apprentice Wizard: image fetch failed"],
      }),
    ],
    reportOptions,
  );

  const [embed] = report.embeds;
  assert.equal(embed.title, "Card catalog sync completed with failures");
  assert.equal(embed.url, reportOptions.runUrl);
  assert.match(embed.description ?? "", /3 of 4 catalogs synced: 12 new cards, 3 updated\./);
  assert.match(embed.description ?? "", /Failed: riftbound \(en\)/);
  assert.match(embed.description ?? "", /Unchanged: gundam \(en\)/);

  const fieldNames = (embed.fields ?? []).map((field) => field.name);
  assert.deepEqual(fieldNames, [
    "Synced: mtg (en)",
    "Failed: riftbound (en)",
    "Synced: sorcery (en)",
  ]);
  assert.match(embed.fields?.[0].value ?? "", /New: Lightning Bolt \(abc\), Counterspell \(abc\) and 10 more/);
  assert.match(embed.fields?.[1].value ?? "", /Riftcodex card list fetch failed: 502/);
  assert.match(embed.fields?.[2].value ?? "", /Apprentice Wizard/);
});

test("the report stays within Discord's embed size limit", () => {
  const longError = "x".repeat(5000);
  const report = buildCatalogSyncReport(
    Array.from({ length: 30 }, (_, index) =>
      catalogResult({ gameKey: `game${index}`, succeeded: false, fatalError: longError }),
    ),
    reportOptions,
  );
  const [embed] = report.embeds;
  const embedLength =
    embed.title.length +
    (embed.description ?? "").length +
    (embed.fields ?? []).reduce((sum, field) => sum + field.name.length + field.value.length, 0);
  assert.ok(embedLength <= 6000, `embed is ${embedLength} characters`);
  assert.ok((embed.fields ?? []).length <= 25);
  assert.equal(embed.color, 0xed4245);
});
