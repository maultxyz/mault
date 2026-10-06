import {
  type PlayingCardWithDistance,
  proxiedImageUrl,
} from "@magic-vault/shared";
import type { DebugCardSet } from "@/lib/interfaces/scanner";

const RISING_FREEDOM_GUNDAM_IMG = proxiedImageUrl(
  "https://www.gundam-gcg.com/en/images/cards/card/EB01-039.webp?260715",
);

const RISING_FREEDOM_GUNDAM: PlayingCardWithDistance = {
  id: "EB01-039",
  name: "Rising Freedom Gundam",
  image: { small: RISING_FREEDOM_GUNDAM_IMG, normal: RISING_FREEDOM_GUNDAM_IMG },
  cmc: 5,
  typeLine: "UNIT",
  text: "When playing this card from your hand, if 3 or more enemy Units are in play, play it as if it has 3 Lv. and cost.",
  power: "4",
  toughness: "4",
  colorIdentity: ["Green"],
  set: "EB01",
  setName: "Eternal Nexus",
  collectorNumber: "039",
  rarity: "c",
  price: null,
  priceFoil: null,
  sourceUrl:
    "https://www.gundam-gcg.com/en/cards/detail.php?detailSearch=EB01-039",
  distance: 0.03,
};

const STRIKE_FREEDOM_GUNDAM_IMG = proxiedImageUrl(
  "https://www.gundam-gcg.com/en/images/cards/card/EB01-041.webp?260715",
);

const STRIKE_FREEDOM_GUNDAM: PlayingCardWithDistance = {
  ...RISING_FREEDOM_GUNDAM,
  id: "EB01-041",
  name: "Strike Freedom Gundam (EX)",
  sourceUrl:
    "https://www.gundam-gcg.com/en/cards/detail.php?detailSearch=EB01-041",
  image: { small: STRIKE_FREEDOM_GUNDAM_IMG, normal: STRIKE_FREEDOM_GUNDAM_IMG },
  cmc: 6,
  typeLine: "UNIT",
  text: "<High-Maneuver> (This Unit can't be blocked.)\n【Deploy】Choose 1 Unit with 4 or less HP belonging to each enemy player. Return them to their owners' hands.",
  power: "5",
  toughness: "5",
  colorIdentity: ["White"],
  set: "EB01",
  setName: "Eternal Nexus",
  collectorNumber: "041",
  rarity: "lr",
  distance: 0.03,
};

const STRIKE_FREEDOM_GUNDAM_P1: PlayingCardWithDistance = {
  ...STRIKE_FREEDOM_GUNDAM,
  id: "EB01-041_p1",
  rarity: "sr",
  distance: 0.05,
};

const STRIKE_FREEDOM_GUNDAM_P2: PlayingCardWithDistance = {
  ...STRIKE_FREEDOM_GUNDAM,
  id: "EB01-041_p2",
  rarity: "sec",
  distance: 0.06,
};

export const gundamDebugCards: DebugCardSet = {
  mockCards: [RISING_FREEDOM_GUNDAM],
  multiMatch: {
    card: STRIKE_FREEDOM_GUNDAM,
    imageUrl: STRIKE_FREEDOM_GUNDAM_IMG,
    alternates: [STRIKE_FREEDOM_GUNDAM_P1, STRIKE_FREEDOM_GUNDAM_P2],
  },
};
