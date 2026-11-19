import assert from "node:assert/strict";
import { test } from "node:test";
import { grandArchiveBackImageUrl } from "../src/lib/adapters/grand-archive/search";
import { normalizeSwuCard } from "../src/lib/adapters/swu/search";
import type { GrandArchiveEdition } from "../src/lib/interfaces/grand-archive";
import type { SwuCard } from "../src/lib/interfaces/swu";

const SWU_LEADER: SwuCard = {
  Set: "SOR",
  Number: "005",
  Name: "Luke Skywalker",
  Subtitle: "Faithful Friend",
  Type: "Leader",
  cid: "1",
  DoubleSided: true,
  Rarity: "Common",
  Unique: true,
  VariantType: "Normal",
  FrontArt: "https://cdn.example/front.png",
  BackArt: "https://cdn.example/back.png",
};

test("SWU leaders expose their back art", () => {
  const card = normalizeSwuCard(SWU_LEADER);
  assert.deepEqual(card.backImage, {
    small: "https://cdn.example/back.png",
    normal: "https://cdn.example/back.png",
  });
  assert.equal(normalizeSwuCard({ ...SWU_LEADER, BackArt: undefined }).backImage, null);
});

test("Grand Archive flip editions use the back orientation's image", () => {
  const edition = {
    image: "/cards/images/front.jpg",
    other_orientations: [
      { name: "Not the back", edition: { image: "/cards/images/other.jpg", orientation: "front" } },
      { name: "Seiryuu, Azure Dragon", edition: { image: "/cards/images/back.jpg", orientation: "back" } },
    ],
  } as unknown as GrandArchiveEdition;
  assert.equal(grandArchiveBackImageUrl(edition), "https://api.gatcg.com/cards/images/back.jpg");
  assert.equal(
    grandArchiveBackImageUrl({ image: "/cards/images/front.jpg" } as GrandArchiveEdition),
    null,
  );
});
