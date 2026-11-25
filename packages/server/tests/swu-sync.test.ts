import assert from "node:assert/strict";
import { test } from "node:test";
import { swuSyncSource } from "../src/lib/adapters/swu/sync";
import { normalizeSwuCard, swuCardImageUrl } from "../src/lib/adapters/swu/search";
import type { SwuCard } from "../src/lib/interfaces/swu";

test("SWU sync keeps promo foils using matching promo artwork and retains their source data", async (t) => {
  const variants = [
    { Number: "012", VariantType: "OP Promo" },
    { Number: "012F", VariantType: "OP Promo Foil" },
    { Number: "127", VariantType: "Normal" },
    { Number: "127F", VariantType: "Foil" },
    { Number: "395", VariantType: "Hyperspace" },
    { Number: "395F", VariantType: "Hyperspace Foil" },
    { Number: "261", VariantType: "Showcase" },
  ];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("/sets")) {
      return Response.json([{ setId: "SOROP", fullName: "OP Promos" }]);
    }
    return Response.json({
      data: variants.map((variant) => ({
        Set: "SOROP",
        Name: "Resupply",
        FrontArt: `https://cdn.swu-db.com/images/cards/SOROP/${variant.Number}.png`,
        ...variant,
      })),
    });
  });

  const cards = await swuSyncSource.fetchCards(swuSyncSource.defaultUrl, () => {}, "en");
  assert.deepEqual(cards.map((card) => card.id), [
    "SOROP-012", "SOROP-012F", "SOROP-127", "SOROP-395", "SOROP-261",
  ]);
  assert.equal(cards[0].imageUrl, "https://cdn.swu-db.com/images/cards/SOROP/012.png");
  assert.equal(cards[1].imageUrl, cards[0].imageUrl);
  const raw = JSON.parse(cards[1].data) as SwuCard;
  assert.equal(raw.Number, "012F");
  assert.equal(raw.VariantType, "OP Promo Foil");
  assert.equal(raw.FrontArt, "https://cdn.swu-db.com/images/cards/SOROP/012F.png");
  const normalized = normalizeSwuCard(raw);
  assert.equal(normalized.id, "SOROP-012F");
  assert.equal(normalized.image?.normal, cards[0].imageUrl);
});

test("single-card sync uses promo artwork without changing the foil identity", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    Set: "TWIOP", Number: "14F", Name: "Disruptive Burst", VariantType: "OP Promo Foil",
    FrontArt: "https://cdn.swu-db.com/images/cards/TWIOP/14F.png",
  }));
  const { card } = await swuSyncSource.fetchOne("TWIOP-14F", swuSyncSource.defaultUrl);
  assert.equal(card?.imageUrl, "https://cdn.swu-db.com/images/cards/TWIOP/14.png");
  assert.equal(JSON.parse(card!.data).Number, "14F");
});

test("promo image resolution preserves custom images and other variants", () => {
  for (const [VariantType, FrontArt] of [
    ["OP Promo Foil", "https://example.com/012F.png"],
    ["OP Promo Foil", "https://cdn.swu-db.com/images/cards/SOROP/custom.png"],
    ["OP Promo Foil", "not a URL"],
    ["Showcase", "https://cdn.swu-db.com/images/cards/SOROP/012F.png"],
  ]) {
    assert.equal(swuCardImageUrl({ VariantType, Number: "012F", FrontArt }), FrontArt);
  }
});
