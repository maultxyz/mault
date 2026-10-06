import {
  type PlayingCardWithDistance,
  proxiedImageUrl,
} from "@magic-vault/shared";
import type { DebugCardSet } from "@/lib/interfaces/scanner";

const PIKACHU_IMG = proxiedImageUrl(
  "https://assets.tcgdex.net/en/base/base1/58/high.webp",
);

const PIKACHU_BASE1: PlayingCardWithDistance = {
  id: "base1-58",
  name: "Pikachu",
  image: { small: PIKACHU_IMG, normal: PIKACHU_IMG },
  cmc: 1,
  typeLine: "Pokemon - Basic",
  text: "When several of these Pokémon gather, their electricity can cause lightning storms.\n\nGnaw (10)\nThunder Jolt (30) Flip a coin. If tails, Pikachu does 10 damage to itself.",
  power: undefined,
  toughness: "40",
  colorIdentity: ["Lightning"],
  set: "base1",
  setName: "Base Set",
  collectorNumber: "58",
  rarity: "common",
  artist: "Mitsuhiro Arita",
  price: null,
  priceFoil: null,
  sourceUrl: "https://tcgdex.dev/cards/base1-58",
  distance: 0.03,
};

const PIKACHU_BASE1_SHADOWLESS: PlayingCardWithDistance = {
  ...PIKACHU_BASE1,
  id: "base1-58_shadowless",
  distance: 0.04,
};

const PIKACHU_BASE1_1ST_EDITION: PlayingCardWithDistance = {
  ...PIKACHU_BASE1,
  id: "base1-58_1st",
  distance: 0.06,
};

export const pokemonDebugCards: DebugCardSet = {
  mockCards: [PIKACHU_BASE1],
  multiMatch: {
    card: PIKACHU_BASE1,
    imageUrl: PIKACHU_IMG,
    alternates: [PIKACHU_BASE1_SHADOWLESS, PIKACHU_BASE1_1ST_EDITION],
  },
};
