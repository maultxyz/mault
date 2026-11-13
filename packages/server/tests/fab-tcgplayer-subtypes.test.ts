import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import { fabAdapter } from "../src/lib/adapters/fab/search";
import { FAB_FALLBACK_TCGPLAYER_SUBTYPES } from "../src/lib/constants/card-search";

function cardWithRaw(raw: unknown): PlayingCard {
  return { id: "tcgp-1", name: "Command and Conquer", raw } as unknown as PlayingCard;
}

test("a TCGTracking fallback card without a Fleshcube printing prices from the generic subtypes", () => {
  const fallback = cardWithRaw({
    source: "tcgtracking",
    product: { id: 1, name: "Command and Conquer" },
    card: { name: "Command and Conquer" },
  });
  assert.deepEqual(fabAdapter.tcgplayer?.subTypes(fallback), FAB_FALLBACK_TCGPLAYER_SUBTYPES);
  assert.equal(fabAdapter.tcgplayer?.productIdFromRaw?.(fallback), undefined);
});

test("a Fleshcube printing still prices from its edition and foiling", () => {
  const card = cardWithRaw({ printing: { foiling: "R", edition: "U", tcgplayer_product_id: 7 } });
  assert.deepEqual(fabAdapter.tcgplayer?.subTypes(card), {
    price: ["Unlimited Edition Rainbow Foil", "Rainbow Foil"],
    priceFoil: ["Unlimited Edition Rainbow Foil", "Rainbow Foil"],
  });
  assert.equal(fabAdapter.tcgplayer?.productIdFromRaw?.(card), 7);
});
