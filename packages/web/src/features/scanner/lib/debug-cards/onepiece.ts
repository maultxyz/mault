import type { PlayingCardWithDistance } from "@magic-vault/shared";
import type { DebugCardSet } from "@/lib/interfaces/scanner";

const NAMI_IMG = "https://optcgapi.com/media/static/Card_Images/OP01-016.jpg";

const NAMI_OP01: PlayingCardWithDistance = {
  id: "OP01-016",
  name: "Nami",
  image: { small: NAMI_IMG, normal: NAMI_IMG },
  cmc: 1,
  typeLine: "Character — Straw Hat Crew",
  text: '[On Play] Look at 5 cards from the top of your deck; reveal up to 1 "Straw Hat Crew" type Character card other than [Nami] and add it to your hand. Then, place the rest at the bottom of your deck in any order.',
  power: "2000",
  colorIdentity: ["Red"],
  set: "OP01",
  setName: "Romance Dawn",
  collectorNumber: "OP01-016",
  rarity: "R",
  price: 3.65,
  priceFoil: null,
  sourceUrl: undefined,
  distance: 0.03,
};

const NAMI_PARALLEL_IMG =
  "https://optcgapi.com/media/static/Card_Images/OP01-016_p1.jpg";

const NAMI_OP01_PARALLEL: PlayingCardWithDistance = {
  ...NAMI_OP01,
  id: "OP01-016_p1",
  name: "Nami (Parallel)",
  image: { small: NAMI_PARALLEL_IMG, normal: NAMI_PARALLEL_IMG },
  price: 412.29,
  distance: 0.05,
};

const NAMI_OP01_MANGA: PlayingCardWithDistance = {
  ...NAMI_OP01,
  id: "OP01-016_p8",
  name: "Nami (OP01-016) (Manga)",
  setName: "Premium Booster -The Best-",
  price: 2057.76,
  distance: 0.06,
};

export const onePieceDebugCards: DebugCardSet = {
  mockCards: [NAMI_OP01],
  multiMatch: {
    card: NAMI_OP01,
    imageUrl: NAMI_IMG,
    alternates: [NAMI_OP01_PARALLEL, NAMI_OP01_MANGA],
  },
};
