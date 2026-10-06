export interface ScryfallImageUris {
  small: string;
  normal: string;
  large?: string;
  png?: string;
}

export interface ScryfallCardFace {
  name?: string;
  printed_name?: string;
  mana_cost?: string;
  oracle_text?: string;
  printed_text?: string;
  power?: string;
  toughness?: string;
  artist?: string;
  image_uris?: ScryfallImageUris;
}

export interface ScryfallApiCard {
  id: string;
  lang?: string;
  name: string;
  printed_name?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  mana_cost?: string;
  cmc?: number;
  type_line: string;
  printed_type_line?: string;
  oracle_text?: string;
  printed_text?: string;
  power?: string;
  toughness?: string;
  color_identity: string[];
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  artist?: string;
  scryfall_uri: string;
  prices: { usd: string | null; usd_foil: string | null };
  tcgplayer_id?: number;
  cardmarket_id?: number;
}

export type ScryfallBulkCard = {
  id: string;
  name: string;
  printed_name?: string;
  lang: string;
  set: string;
  image_uris?: ScryfallImageUris;
  card_faces?: { image_uris?: ScryfallImageUris }[];
};
