import type { PlayingCardWithDistance } from "@magic-vault/shared";
import type { DebugCardSet } from "@/lib/interfaces/scanner";

const ENLIGHTENED_STRIKE_IMG =
  "https://storage.googleapis.com/fabmaster/media/images/1HP361.width-450.png";

const ENLIGHTENED_STRIKE: PlayingCardWithDistance = {
  id: "NGz8wFDFGQLf9TGTzJMPb",
  name: "Enlightened Strike",
  image: { small: ENLIGHTENED_STRIKE_IMG, normal: ENLIGHTENED_STRIKE_IMG },
  cmc: 0,
  typeLine: "Generic Action - Attack",
  text: "As an additional cost to play Enlightened Strike, put a card from your hand on the bottom of your deck.\nChoose 1;\n- When you attack with Enlightened Strike, draw a card.\n- Enlightened Strike gains +2{p}.\n- Enlightened Strike gains go again.",
  power: "5",
  toughness: "3",
  colorIdentity: ["Red"],
  set: "1HP",
  setName: "1HP",
  collectorNumber: "1HP361",
  rarity: "m",
  artist: "Adolfo Navarro",
  price: null,
  priceFoil: null,
  sourceUrl:
    "https://www.tcgplayer.com/product/270948?Language=English&Printing=Normal",
  distance: 0.03,
};

const ENLIGHTENED_STRIKE_COLD_FOIL_IMG =
  "https://legendstory-production-s3-public.s3.amazonaws.com/media/cards/large/ANQ000-MV.webp";

const ENLIGHTENED_STRIKE_COLD_FOIL: PlayingCardWithDistance = {
  ...ENLIGHTENED_STRIKE,
  id: "MjnD9RNkC89jdPGg9pJd7",
  name: "Enlightened Strike (Cold Foil)",
  image: {
    small: ENLIGHTENED_STRIKE_COLD_FOIL_IMG,
    normal: ENLIGHTENED_STRIKE_COLD_FOIL_IMG,
  },
  set: "ANQ",
  setName: "ANQ",
  collectorNumber: "ANQ000",
  rarity: "v",
  artist: "Wisnu Tan",
  sourceUrl:
    "https://www.tcgplayer.com/product/678563?Language=English&Printing=Cold+Foil",
  distance: 0.05,
};

const ENLIGHTENED_STRIKE_1ST_EDITION_IMG =
  "https://storage.googleapis.com/fabmaster/cardfaces/2019-WTR/WTR159.png";

const ENLIGHTENED_STRIKE_1ST_EDITION: PlayingCardWithDistance = {
  ...ENLIGHTENED_STRIKE,
  id: "9KzHqMNTNKLqpDJQRdDdN",
  name: "Enlightened Strike (1st Edition Rainbow Foil)",
  image: {
    small: ENLIGHTENED_STRIKE_1ST_EDITION_IMG,
    normal: ENLIGHTENED_STRIKE_1ST_EDITION_IMG,
  },
  set: "WTR",
  setName: "WTR",
  collectorNumber: "WTR159",
  sourceUrl:
    "https://www.tcgplayer.com/product/225229?Language=English&Printing=1st+Edition+Rainbow+Foil",
  distance: 0.06,
};

export const fabDebugCards: DebugCardSet = {
  mockCards: [ENLIGHTENED_STRIKE],
  multiMatch: {
    card: ENLIGHTENED_STRIKE,
    imageUrl: ENLIGHTENED_STRIKE_IMG,
    alternates: [ENLIGHTENED_STRIKE_COLD_FOIL, ENLIGHTENED_STRIKE_1ST_EDITION],
  },
};
