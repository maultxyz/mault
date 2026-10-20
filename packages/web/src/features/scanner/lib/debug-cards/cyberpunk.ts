import type { PlayingCardWithDistance } from "@magic-vault/shared";
import type { DebugCardSet } from "@/lib/interfaces/scanner";

const ADAM_SMASHER_IMG =
  "/api/cards/netdeck-image/cyberpunk/adam-smasher-ender-of-legends/a9c1137e-2e33-4293-9dcc-9351c9a0bbee";

const ADAM_SMASHER: PlayingCardWithDistance = {
  id: "a9c1137e-2e33-4293-9dcc-9351c9a0bbee",
  name: "Adam Smasher: Ender of Legends",
  image: { small: ADAM_SMASHER_IMG, normal: ADAM_SMASHER_IMG },
  cmc: 9,
  power: "9",
  typeLine: "Legend - Arasaka Merc",
  text: "{Go Solo} (Pay this Legend's cost to play it as a ready Unit. It can attack this turn. If it leaves the field, remove it from the game.)\n{Play} Defeat a rival Unit.",
  colorIdentity: ["Red"],
  set: "welcometonightcityretail",
  setName: "Welcome to Night City - Retail",
  collectorNumber: "001",
  rarity: "epic",
  artist: "Michał Dziekan",
  price: null,
  priceFoil: null,
  distance: 0.03,
};

const V_STREETKID_IMG =
  "/api/cards/netdeck-image/cyberpunk/v-streetkid/3fc63c58-5954-4744-a5af-047bfc5cb159";

const V_STREETKID: PlayingCardWithDistance = {
  id: "3fc63c58-5954-4744-a5af-047bfc5cb159",
  name: "V: Streetkid",
  image: { small: V_STREETKID_IMG, normal: V_STREETKID_IMG },
  cmc: 5,
  power: "6",
  typeLine: "Legend - Merc",
  text: "{Call} Trash 3. Then, add 1 BRAINDANCE Program from your trash to your hand.\n{Go Solo} (Pay this Legend's cost to play it as a ready Unit. It can attack this turn. If it leaves the field, remove it from the game.)",
  colorIdentity: ["Red"],
  set: "welcometonightcityretail",
  setName: "Welcome to Night City - Retail",
  collectorNumber: "005a",
  rarity: "rare",
  artist: "Olgierd Ciszak",
  price: null,
  priceFoil: null,
  distance: 0.04,
};

const V_STREETKID_B_IMG =
  "/api/cards/netdeck-image/cyberpunk/v-streetkid/c2d0e2a7-470f-4498-b6d5-5df1e3ecc3ef";

const V_STREETKID_B: PlayingCardWithDistance = {
  ...V_STREETKID,
  id: "c2d0e2a7-470f-4498-b6d5-5df1e3ecc3ef",
  image: { small: V_STREETKID_B_IMG, normal: V_STREETKID_B_IMG },
  collectorNumber: "005b",
  distance: 0.05,
};

const V_STREETKID_ICONIC_IMG =
  "/api/cards/netdeck-image/cyberpunk/v-streetkid/837d354a-a1c8-4df0-b4ac-4db43730187a";

const V_STREETKID_ICONIC: PlayingCardWithDistance = {
  ...V_STREETKID,
  id: "837d354a-a1c8-4df0-b4ac-4db43730187a",
  image: { small: V_STREETKID_ICONIC_IMG, normal: V_STREETKID_ICONIC_IMG },
  collectorNumber: "144",
  rarity: "iconic legend",
  artist: "Pandart Studio",
  distance: 0.06,
};

export const cyberpunkDebugCards: DebugCardSet = {
  mockCards: [ADAM_SMASHER],
  multiMatch: {
    card: V_STREETKID,
    imageUrl: V_STREETKID_IMG,
    alternates: [V_STREETKID_B, V_STREETKID_ICONIC],
  },
};
