import type { CardCondition } from "../interfaces/card-condition.interface";

export const CONDITION_EXPORT_LABELS: Record<CardCondition, string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

export const MANABOX_LANGUAGE_CODES: Record<string, string> = {
  zhs: "zh_CN",
  zht: "zh_TW",
};

export const MOXFIELD_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  it: "Italian",
  es: "Spanish",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  zhs: "Chinese Simplified",
  zht: "Chinese Traditional",
};

export const POWERTOOLS_FINISH_FAMILY_TOKENS: Record<string, string> = {
  Holo: "Holo",
  "Reverse Holo": "ReverseHolo",
};

export const POWERTOOLS_FINISH_PATTERN_TOKENS: Record<string, string> = {
  "Poké Ball": "Pokeball",
  "Master Ball": "Masterball",
  "Energy Symbol": "Energy",
  "Friend Ball": "Friendball",
  "Dusk Ball": "Duskball",
  "Love Ball": "Loveball",
  "Quick Ball": "Quickball",
  "Team Rocket": "TeamRocket",
  Cosmos: "Cosmos",
  "Cracked Ice": "IceCracked",
  Galaxy: "Galaxy",
  Rainbow: "Rainbow",
  Gold: "Gold",
  Tinsel: "Tinsel",
  Mirror: "Mirror",
  Starlight: "Starlight",
  "League Stamp": "League",
  "Player Rewards Stamp": "PlayerRewards",
  "Professor Program Stamp": "ProfessorProgram",
};

export const NONFOIL_FINISH_LABEL = "Normal";

export const FOIL_FINISH_LABEL = "Foil";

export const TCGPLAYER_PRODUCT_LINES: Record<string, string> = {
  mtg: "Magic",
  pokemon: "Pokemon",
  pokemonjp: "Pokemon Japan",
  yugioh: "YuGiOh",
  lorcana: "Lorcana TCG",
  onepiece: "One Piece Card Game",
  fab: "Flesh and Blood TCG",
  swu: "Star Wars: Unlimited",
  gundam: "Gundam Card Game",
  grandarchive: "Grand Archive TCG",
};

export const SORTSWIFT_CONDITION_CODES: Record<CardCondition, string> = {
  NM: "NM",
  LP: "LP",
  MP: "MP",
  HP: "HP",
  DMG: "DM",
};

export const SORTSWIFT_PRICE_HEADERS = [
  "TCGPlayer Price",
  "Shopify Price",
  "Cardtrader Price",
  "Manapool Price",
  "Misprint Price",
  "eBay Price",
  "Square Price",
];

export const SORTSWIFT_OVERRIDE_PRICE_HEADERS = [
  "Override Price",
  "Override Price (Internal)",
  "Override Price (Tcgplayer)",
  "Override Price (Shopify)",
  "Override Price (Ebay)",
  "Override Price (Cardtrader)",
  "Override Price (Manapool)",
  "Override Price (Misprint)",
  "Override Price (Square)",
  "Override Price (Walmart)",
  "Override Price (Woocommerce)",
  "Override Price (Lgsmarket)",
  "Override Price (Cardnexus)",
];
