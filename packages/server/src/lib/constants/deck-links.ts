export const MOXFIELD_DECK_API_URL = "https://api2.moxfield.com/v3/decks/all/";

export const ARCHIDEKT_DECK_API_URL = "https://archidekt.com/api/decks/";

export const MOXFIELD_IMPORTED_BOARDS = [
  "commanders",
  "companions",
  "signatureSpells",
  "mainboard",
  "sideboard",
] as const;

export const DECK_LINK_FOIL_FINISHES = ["foil", "etched"];

export const DECK_LINK_CACHE_TTL_MS = 5 * 60 * 1000;

export const DECK_LINK_CACHE_MAX_ENTRIES = 200;
