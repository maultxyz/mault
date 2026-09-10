import type { PlayingCardWithDistance, ScannedCard } from "@magic-vault/shared";

export interface DemoScannedCard {
  card: PlayingCardWithDistance;
  binNumber: number;
  isFoil?: boolean;
}

// Adapts the demo data to the real ScannedCard shape so it can be fed
// straight into features/scanner/lib/compute-stats.ts - a pure function,
// safe to reuse outside the app's data-fetching providers.
export function toScannedCards(entries: DemoScannedCard[]): ScannedCard[] {
  return entries.map((d, i) => ({
    scanId: d.card.id,
    card: d.card,
    scannedAt: Date.now() - i * 60_000,
    binNumber: d.binNumber,
    isFoil: d.isFoil,
  }));
}

// Real Scryfall data for a handful of well-known cards, captured ahead of
// time so the hero mockup doesn't depend on a live API call at page load.
export const DEMO_SCANNED_CARDS: DemoScannedCard[] = [
  {
    binNumber: 2,
    card: {
      id: "demo-lightning-bolt",
      name: "Lightning Bolt",
      image: {
        small:
          "https://cards.scryfall.io/normal/front/e/7/e768c957-3a1f-42f5-853a-96942f645df5.jpg",
        normal:
          "https://cards.scryfall.io/normal/front/e/7/e768c957-3a1f-42f5-853a-96942f645df5.jpg",
      },
      set: "m11",
      setName: "Magic 2011",
      collectorNumber: "149",
      rarity: "common",
      typeLine: "Instant",
      colorIdentity: ["R"],
      price: 0.88,
      priceFoil: 5.61,
      distance: 0.04,
    },
  },
  {
    binNumber: 5,
    card: {
      id: "demo-sol-ring",
      name: "Sol Ring",
      image: {
        small:
          "https://cards.scryfall.io/normal/front/5/8/58b26011-e103-45c4-a253-900f4e6b2eeb.jpg",
        normal:
          "https://cards.scryfall.io/normal/front/5/8/58b26011-e103-45c4-a253-900f4e6b2eeb.jpg",
      },
      set: "cmr",
      setName: "Commander Legends",
      collectorNumber: "472",
      rarity: "uncommon",
      typeLine: "Artifact",
      colorIdentity: [],
      price: 1.77,
      priceFoil: null,
      distance: 0.02,
    },
  },
  {
    binNumber: 1,
    card: {
      id: "demo-counterspell",
      name: "Counterspell",
      image: {
        small:
          "https://cards.scryfall.io/normal/front/2/9/29bb1b85-9444-4bfa-b622-092a6873631c.jpg",
        normal:
          "https://cards.scryfall.io/normal/front/2/9/29bb1b85-9444-4bfa-b622-092a6873631c.jpg",
      },
      set: "7ed",
      setName: "Seventh Edition",
      collectorNumber: "67",
      rarity: "common",
      typeLine: "Instant",
      colorIdentity: ["U"],
      price: 2.68,
      priceFoil: null,
      distance: 0.11,
    },
  },
  {
    binNumber: 4,
    card: {
      id: "demo-llanowar-elves",
      name: "Llanowar Elves",
      image: {
        small:
          "https://cards.scryfall.io/normal/front/7/3/73542493-cd0b-4bb7-a5b8-8f889c76e4d6.jpg",
        normal:
          "https://cards.scryfall.io/normal/front/7/3/73542493-cd0b-4bb7-a5b8-8f889c76e4d6.jpg",
      },
      set: "m19",
      setName: "Core Set 2019",
      collectorNumber: "314",
      rarity: "common",
      typeLine: "Creature — Elf Druid",
      colorIdentity: ["G"],
      price: 0.32,
      priceFoil: null,
      distance: 0.03,
    },
  },
  {
    binNumber: 3,
    card: {
      id: "demo-brainstorm",
      name: "Brainstorm",
      image: {
        small:
          "https://cards.scryfall.io/normal/front/3/e/3e4e6787-af32-44f2-ac56-6f348254aa6d.jpg",
        normal:
          "https://cards.scryfall.io/normal/front/3/e/3e4e6787-af32-44f2-ac56-6f348254aa6d.jpg",
      },
      set: "ema",
      setName: "Eternal Masters",
      collectorNumber: "40",
      rarity: "uncommon",
      typeLine: "Instant",
      colorIdentity: ["U"],
      price: 2.16,
      priceFoil: 2.9,
      distance: 0.07,
    },
  },
  {
    binNumber: 6,
    isFoil: true,
    card: {
      id: "demo-ragavan",
      name: "Ragavan, Nimble Pilferer",
      image: {
        small:
          "https://cards.scryfall.io/normal/front/a/9/a9738cda-adb1-47fb-9f4c-ecd930228c4d.jpg",
        normal:
          "https://cards.scryfall.io/normal/front/a/9/a9738cda-adb1-47fb-9f4c-ecd930228c4d.jpg",
      },
      set: "mh2",
      setName: "Modern Horizons 2",
      collectorNumber: "138",
      rarity: "mythic",
      typeLine: "Legendary Creature — Monkey Pirate",
      colorIdentity: ["R"],
      price: 42.16,
      priceFoil: 57.26,
      distance: 0.02,
    },
  },
];
