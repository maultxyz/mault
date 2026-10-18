export interface NetdeckSet {
  code: string;
  name: string;
}

export interface NetdeckPrinting {
  id: string;
  collector_number: string;
  image_url?: string;
  source_image_url: string | null;
  set: NetdeckSet;
  rarity: string | null;
  finish: string | null;
  artist: string | null;
  language: string;
  localized_name: string | null;
  printed_rules_text: string | null;
  official_rules_text: string | null;
}

export interface NetdeckCard {
  id: string;
  external_id: string;
  name: string;
  subname: string | null;
  display_name: string;
  slug: string;
  rules_text: string | null;
  printed_rules_text: string | null;
  official_rules_text: string | null;
  flavor_text: string | null;
  language: string;
  printing_id: string;
  selected_printing_id: string;
  set: NetdeckSet;
  rarity: string | null;
  image_url?: string;
  source_image_url: string | null;
  color: string | null;
  card_type: string;
  classifications: string[];
  keywords: string[];
  cost: number | null;
  power: number | null;
  artist: string | null;
  print_number: string | null;
  printings: NetdeckPrinting[];
}

export interface NetdeckListResponse {
  items: NetdeckCard[];
  total: number;
  limit: number;
  offset: number;
}

export interface NetdeckImageCacheEntry {
  urls: Map<string, string>;
  expiresAt: number;
}
