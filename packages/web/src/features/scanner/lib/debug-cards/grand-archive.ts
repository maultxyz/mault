import type { PlayingCardWithDistance } from "@magic-vault/shared";
import type { DebugCardSet } from "@/lib/interfaces/scanner";

const ALICE_IMG = "https://api.gatcg.com/cards/images/QOTMVyjCSK.jpg";

const ALICE_DISTORTED_QUEEN: PlayingCardWithDistance = {
  id: "alice-distorted-queen-ptm",
  name: "Alice, Distorted Queen",
  image: { small: ALICE_IMG, normal: ALICE_IMG },
  cmc: 1,
  typeLine: "Champion - Cleric Distortion Human",
  text: "On Enter: You gain the Phantasmagoria mastery. Then put two haunt counters on it.",
  toughness: "19",
  colorIdentity: ["Norm"],
  set: "PTM",
  setName: "Phantom Monarchs",
  collectorNumber: "002",
  rarity: "super rare",
  artist: "YOHAKU",
  price: null,
  priceFoil: null,
  sourceUrl: "https://index.gatcg.com/edition/alice-distorted-queen-ptm",
  distance: 0.03,
};

const ALICE_CSR_IMG = "https://api.gatcg.com/cards/images/GG1XAzHmIN.jpg";

const ALICE_DISTORTED_QUEEN_CSR: PlayingCardWithDistance = {
  ...ALICE_DISTORTED_QUEEN,
  id: "alice-distorted-queen-ptm1e-csr",
  image: { small: ALICE_CSR_IMG, normal: ALICE_CSR_IMG },
  set: "PTM 1st",
  setName: "Phantom Monarchs First Edition",
  rarity: "collector super rare",
  artist: undefined,
  sourceUrl: "https://index.gatcg.com/edition/alice-distorted-queen-ptm1e-csr",
  distance: 0.05,
};

export const grandArchiveDebugCards: DebugCardSet = {
  mockCards: [ALICE_DISTORTED_QUEEN],
  multiMatch: {
    card: ALICE_DISTORTED_QUEEN,
    imageUrl: ALICE_IMG,
    alternates: [ALICE_DISTORTED_QUEEN_CSR],
  },
};
