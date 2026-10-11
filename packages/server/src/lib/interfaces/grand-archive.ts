export interface GrandArchiveSet {
  id: string;
  name: string;
  prefix: string;
  language: string;
  release_date: string | null;
}

export interface GrandArchiveCirculation {
  uuid: string;
  foil: boolean;
  kind: string;
  population: number | null;
}

export interface GrandArchiveEdition {
  uuid: string;
  card_id: string;
  slug: string;
  collector_number: string;
  configuration: string | null;
  orientation: string | null;
  image: string | null;
  illustrator: string | null;
  rarity: number;
  effect: string | null;
  effect_raw: string | null;
  flavor: string | null;
  set: GrandArchiveSet;
  circulations: GrandArchiveCirculation[];
  circulationTemplates: GrandArchiveCirculation[];
}

export interface GrandArchiveCard {
  uuid: string;
  slug: string;
  name: string;
  classes: string[];
  types: string[];
  subtypes: string[];
  element: string | null;
  elements: string[];
  cost_memory: number | null;
  cost_reserve: number | null;
  level: number | null;
  life: number | null;
  power: number | null;
  durability: number | null;
  speed: boolean | null;
  effect: string | null;
  effect_raw: string | null;
  flavor: string | null;
  editions: GrandArchiveEdition[];
}

export interface GrandArchiveSearchResponse {
  data: GrandArchiveCard[];
  page: number;
  page_size: number;
  total_cards: number;
  total_pages: number;
  has_more: boolean;
}
