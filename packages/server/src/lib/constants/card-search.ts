export const CARD_API_USER_AGENT = "MagicVault/1.0";

export const CARD_API_HEADERS: Record<string, string> = {
  "User-Agent": CARD_API_USER_AGENT,
  Accept: "application/json",
};

// Softmax temperature over the nearest candidates' similarities. At 0.05 a
// 0.05 lead over the runner-up reads as ~73% confidence, 0.1 as ~88% and
// 0.2 as ~98%. Lower is more decisive, higher more hedged.
export const MATCH_CONFIDENCE_TEMPERATURE = 0.05;

// Max cosine distance between two cards' reference embeddings for them to
// count as the same art (reprints), pooling their match confidence.
export const DUPLICATE_PRINTING_MAX_DISTANCE = 0.02;

export const STORED_SEARCH_LIMIT = 60;

export const FAB_SEARCH_CARD_LIMIT = 12;
export const FAB_STANDARD_FOILING = "S";
export const FAB_TCGPLAYER_FOIL_NAMES: Record<string, string> = {
  S: "Normal",
  R: "Rainbow Foil",
  C: "Cold Foil",
  G: "Cold Foil",
};
export const FAB_TCGPLAYER_EDITION_PREFIXES: Record<string, string> = {
  A: "1st Edition ",
  F: "1st Edition ",
  U: "Unlimited Edition ",
};

export const MATCH_MAX_DISTANCE_RATIO = 0.9;
