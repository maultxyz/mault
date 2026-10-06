import type { PlayingCardWithDistance } from "@magic-vault/shared";
import type { DebugCardSet } from "@/lib/interfaces/scanner";

const ARIEL_IMG =
  "https://cards.lorcast.io/card/digital/normal/crd_d9f3b86af85f48579ed9d0d7ce0de129.avif?1709690747";

const ARIEL_ON_HUMAN_LEGS: PlayingCardWithDistance = {
  id: "1-1",
  name: "Ariel - On Human Legs",
  image: { small: ARIEL_IMG, normal: ARIEL_IMG },
  cmc: 4,
  typeLine: "Character — Storyborn, Hero, Princess",
  text: "VOICELESS This character can't {E} to sing songs.",
  power: "3",
  toughness: "4",
  colorIdentity: ["Amber"],
  set: "1",
  setName: "The First Chapter",
  collectorNumber: "1",
  rarity: "uncommon",
  artist: "Matthew Robert Davies",
  price: 0.1,
  priceFoil: 0.5,
  sourceUrl: undefined,
  distance: 0.03,
};

const ARIEL_ON_HUMAN_LEGS_FOIL: PlayingCardWithDistance = {
  ...ARIEL_ON_HUMAN_LEGS,
  id: "1-1_foil",
  distance: 0.05,
};

const ARIEL_ON_HUMAN_LEGS_ENCHANTED: PlayingCardWithDistance = {
  ...ARIEL_ON_HUMAN_LEGS,
  id: "1-1_enchanted",
  rarity: "enchanted",
  price: 45,
  distance: 0.06,
};

export const lorcanaDebugCards: DebugCardSet = {
  mockCards: [ARIEL_ON_HUMAN_LEGS],
  multiMatch: {
    card: ARIEL_ON_HUMAN_LEGS,
    imageUrl: ARIEL_IMG,
    alternates: [ARIEL_ON_HUMAN_LEGS_FOIL, ARIEL_ON_HUMAN_LEGS_ENCHANTED],
  },
};
