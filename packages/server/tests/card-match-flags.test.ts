import assert from "node:assert/strict";
import { test } from "node:test";
import { sql } from "drizzle-orm";
import { cardMatchFlagsSql } from "../src/lib/card-match-flags";
import { resolveCardSearchForGame } from "../src/lib/card-search/resolve";
import type { CardSearchAdapter } from "../src/lib/interfaces/card-search";

test("stored match flags keep their fingerprint until the adapter's flag SQL changes", () => {
  const scryfall = resolveCardSearchForGame("mtg", "en")!.adapter;
  const fingerprint = cardMatchFlagsSql(scryfall).fingerprint;

  assert.equal(cardMatchFlagsSql(resolveCardSearchForGame("mtg", "en")!.adapter).fingerprint, fingerprint);
  assert.ok(Number.isInteger(fingerprint) && fingerprint >= 0 && fingerprint <= 0x7fffffff);

  const changedRarity: CardSearchAdapter = {
    ...scryfall,
    rarePrintingSql: sql`(data->>'promo') = 'true'`,
  };
  assert.notEqual(cardMatchFlagsSql(changedRarity).fingerprint, fingerprint);
  assert.notEqual(
    cardMatchFlagsSql(resolveCardSearchForGame("pokemon", "en")!.adapter).fingerprint,
    fingerprint,
  );
});
