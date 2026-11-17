import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import { withCatalogCard } from "../src/lib/saved-cards";

const saved = { id: "old-id", name: "Gangplank, Naval" } as PlayingCard;

test("a saved card whose catalog card is gone keeps its saved fields", () => {
  const hydrated = withCatalogCard(saved, undefined, { includeRaw: false });
  assert.equal(hydrated.name, "Gangplank, Naval");
  assert.equal(hydrated.isMissingFromCatalog, undefined);
});

test("a stale missing flag stored on a snapshot never survives hydration", () => {
  const stale = { ...saved, isMissingFromCatalog: true };
  assert.equal(withCatalogCard(stale, undefined, { includeRaw: true }).isMissingFromCatalog, undefined);
  assert.equal(withCatalogCard(stale, saved, { includeRaw: false }).isMissingFromCatalog, undefined);
});
