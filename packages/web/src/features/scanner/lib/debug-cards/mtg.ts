import type { PlayingCardWithDistance } from "@magic-vault/shared";
import type { DebugCardSet } from "@/lib/interfaces/scanner";

const LIGHTNING_BOLT_M11: PlayingCardWithDistance = {
  id: "e3285e6b-3e79-4d7c-bf96-d920f973b122",
  name: "Lightning Bolt",
  image: {
    small:
      "https://cards.scryfall.io/small/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
    normal:
      "https://cards.scryfall.io/normal/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
  },
  manaCost: "{R}",
  cmc: 1,
  typeLine: "Instant",
  text: "Lightning Bolt deals 3 damage to any target.",
  colorIdentity: ["R"],
  set: "m11",
  setName: "Magic 2011",
  collectorNumber: "149",
  rarity: "common",
  artist: "Christopher Moeller",
  price: 1.2,
  priceFoil: 4.5,
  sourceUrl: "https://scryfall.com/card/m11/149/lightning-bolt",
  distance: 0.03,
};

const LIGHTNING_BOLT_A25: PlayingCardWithDistance = {
  ...LIGHTNING_BOLT_M11,
  id: "debug-bolt-a25",
  sourceUrl: "https://scryfall.com/card/a25/140/lightning-bolt",
  set: "a25",
  setName: "Masters 25",
  collectorNumber: "140",
  price: 0.75,
  distance: 0.05,
};

const LIGHTNING_BOLT_2X2: PlayingCardWithDistance = {
  ...LIGHTNING_BOLT_M11,
  id: "debug-bolt-2x2",
  sourceUrl: "https://scryfall.com/card/2x2/117/lightning-bolt",
  set: "2x2",
  setName: "Double Masters 2022",
  collectorNumber: "117",
  price: 0.9,
  distance: 0.06,
};

const FAKE_SCAN_URL =
  "https://cards.scryfall.io/art_crop/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg";

export const mtgDebugCards: DebugCardSet = {
  mockCards: [LIGHTNING_BOLT_M11],
  multiMatch: {
    card: LIGHTNING_BOLT_M11,
    imageUrl: FAKE_SCAN_URL,
    alternates: [LIGHTNING_BOLT_A25, LIGHTNING_BOLT_2X2],
  },
};
