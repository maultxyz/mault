export const ONE_PIECE_PRINTED_ID_PATTERN = /^(?:OP|ST|EB|PRB)\d{2}-\d{3}$|^P-\d{3}$/;

export const ONE_PIECE_NAME_TAG_PATTERNS: readonly RegExp[] = [
  /\s*\([^()]*\)$/,
  /\s*\[[^[\]]*\]$/,
  /\s*-\s*(?:OP|ST|EB|PRB|P)\d*-\d+$/,
  /\s+-(?:\s+[^-]+)?$/,
];

export const ONE_PIECE_REPRINT_CARD_ID_PATTERN = /_r\d+$/;
export const ONE_PIECE_REPRINT_CARD_ID_SQL_PATTERN = "_r[0-9]+$";

export const ONE_PIECE_FOIL_VARIANT_NAME_PATTERN =
  /\((?:Jolly Roger|Pirate|Textured) Foil\)/i;
export const ONE_PIECE_TEXTURED_FOIL_NAME_PATTERN = /\(Textured Foil\)/i;
export const ONE_PIECE_REPRINT_NAME_PATTERN = /\(Reprint\)/i;
export const ONE_PIECE_RARE_PRINTING_NAME_SQL_PATTERN =
  "\\((reprint|jolly roger foil|pirate foil|textured foil)\\)";

export const ONE_PIECE_RARITIES_WITHOUT_FOIL_BASE_PRINTING: readonly string[] = [
  "C",
  "UC",
  "R",
];

export const ONE_PIECE_WHITESPACE_SQL_PATTERN = "\\s+";
export const ONE_PIECE_PROMO_PRODUCT_NAME = "one piece promotion cards";

export const ONE_PIECE_PRODUCTS_WITHOUT_LANGUAGE_CODE: readonly string[] = [
  "romance dawn",
  "paramount war",
  "pillars of strength",
  "kingdoms of intrigue",
  "awakening of the new era",
  "wings of the captain",
  "500 years in the future",
  "two legends",
  "emperors in the new world",
  "royal blood",
  "extra booster: memorial collection",
  "premium booster -the best-",
  "starter deck 1: straw hat crew",
  "starter deck 2: worst generation",
  "starter deck 3: the seven warlords of the sea",
  "starter deck 4: animal kingdom pirates",
  "starter deck 5: film edition",
  "starter deck 6: absolute justice",
  "starter deck 7: big mom pirates",
  "starter deck 8: monkey.d.luffy",
  "starter deck 9: yamato",
  "ultra deck: the three captains",
  "starter deck 11: uta",
  "starter deck 12: zoro and sanji",
  "ultra deck: the three brothers",
  "starter deck 14: 3d2y",
  "starter deck 15: red edward.newgate",
  "starter deck 16: green uta",
  "starter deck 17: blue donquixote doflamingo",
  "starter deck 18: purple monkey.d.luffy",
  "starter deck 19: black smoker",
  "starter deck 20: yellow charlotte katakuri",
  "starter deck ex: gear 5",
];
