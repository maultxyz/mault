export interface FleshcubePrice {
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  priceLastUpdated: string | null;
}

export interface FleshcubePrinting {
  uniqueId: string;
  setPrintingUniqueId: string;
  cardId: string;
  setId: string;
  edition: string;
  foiling: string;
  rarity: string;
  expansionSlot: boolean;
  artists: string[];
  artVariations: string[];
  flavorText: string | null;
  flavorTextPlain: string | null;
  imageUrl: string | null;
  imageRotationDegrees: number;
  tcgplayerProductId: string | null;
  tcgplayerUrl: string | null;
  tcgPlayerPrice: FleshcubePrice | null;
}

export interface FleshcubeCard {
  uniqueId: string;
  name: string;
  color: string | null;
  pitch: string | null;
  cost: string | null;
  power: string | null;
  defense: string | null;
  health: string | null;
  intelligence: string | null;
  arcane: string | null;
  types: string[];
  traits: string[];
  keywords: string[];
  functionalText: string | null;
  functionalTextPlain: string | null;
  typeText: string | null;
  cardPrintings: FleshcubePrinting[];
}

export interface FleshcubeSearchPrinting {
  uniqueId: string;
  cardId: string;
  setId: string;
  imageUrl: string | null;
}

export interface FleshcubeSearchCard {
  uniqueId: string;
  name: string;
  printings: FleshcubeSearchPrinting[];
}

export interface FleshcubeSearchResponse {
  results: FleshcubeSearchCard[];
  page: number;
  pageSize: number;
  total: number;
}

export interface FabPrinting {
  unique_id: string;
  set_printing_unique_id: string;
  id: string;
  set_id: string;
  edition: string;
  foiling: string;
  rarity: string;
  expansion_slot: boolean;
  artists: string[];
  art_variations: string[];
  flavor_text: string;
  flavor_text_plain: string;
  image_url: string | null;
  image_rotation_degrees: number;
  tcgplayer_product_id: string | null;
  tcgplayer_url: string | null;
  tcgplayer_price: FleshcubePrice | null;
}

export interface FabCard {
  unique_id: string;
  name: string;
  color: string;
  pitch: string;
  cost: string;
  power: string;
  defense: string;
  health: string;
  intelligence: string;
  arcane: string;
  types: string[];
  traits: string[];
  card_keywords: string[];
  functional_text: string;
  functional_text_plain: string;
  type_text: string;
}
