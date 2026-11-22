import assert from "node:assert/strict";
import { test } from "node:test";
import { withRawCardDataForRules, type PlayingCard } from "@magic-vault/shared";
import { withoutRawCardData } from "../src/lib/saved-cards";

const cardWithRawData = {
  id: "main",
  name: "Lightning Bolt",
  raw: { type_line: "Instant" },
} as PlayingCard;
const alternativeWithRawData = {
  id: "alternative",
  name: "Lightning Bolt",
  raw: { type_line: "Instant" },
} as PlayingCard;

test("raw card data is dropped from the main card and every alternative", () => {
  const [scan] = withoutRawCardData([
    { card: cardWithRawData, alternativeMatches: [alternativeWithRawData] },
  ]);
  const json = JSON.parse(JSON.stringify(scan));
  assert.equal("raw" in json.card, false);
  assert.equal("raw" in json.alternativeMatches[0], false);
  assert.equal(json.card.name, "Lightning Bolt");
  assert.equal(cardWithRawData.raw !== undefined, true);
});

test("a card without raw data gets it from the catalog before rules run", async () => {
  const withoutRaw = { id: "main", name: "Lightning Bolt" } as PlayingCard;
  const loaded = await withRawCardDataForRules(withoutRaw, async () => cardWithRawData);
  assert.deepEqual(loaded.raw, { type_line: "Instant" });
  assert.equal(loaded.name, "Lightning Bolt");
});

test("a card that already has raw data is never looked up", async () => {
  let lookups = 0;
  const loaded = await withRawCardDataForRules(cardWithRawData, async () => {
    lookups += 1;
    return null;
  });
  assert.equal(lookups, 0);
  assert.equal(loaded, cardWithRawData);
});
