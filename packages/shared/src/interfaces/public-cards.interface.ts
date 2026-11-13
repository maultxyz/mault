import type {
  PUBLIC_CARD_FINISHES,
  PUBLIC_CARD_SORTS,
} from "../constants/public-cards.constant";
import type { ConditionMultipliers } from "./card-condition.interface";
import type { PriceSource } from "./price-source.interface";
import type { SharedStorageCard } from "./storage-locations.interface";

export type PublicCardSort = (typeof PUBLIC_CARD_SORTS)[number];

export type PublicCardFinish = (typeof PUBLIC_CARD_FINISHES)[number];

export interface PublicCardGame {
  key: string;
  name: string;
  cardCount: number;
}

export interface PublicCardBrowseInfo {
  cardCount: number;
  showsPrices: boolean;
  priceSource: PriceSource;
  conditionMultipliers: ConditionMultipliers;
  games: PublicCardGame[];
  shopPhotoUrl: string | null;
  primaryColor: string | null;
}

export type PublicCard = Omit<SharedStorageCard, "position">;

export interface PublicCardPage {
  cards: PublicCard[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PublicCardFilters {
  sets: string[];
  rarities: string[];
  colors: string[];
  foilTypes: string[];
  conditions: string[];
  languages: string[];
  finish: PublicCardFinish;
  minPrice: number | null;
  maxPrice: number | null;
}

export interface PublicCardFacetCount {
  key: string;
  count: number;
}

export interface PublicCardFacets {
  sets: { code: string; name: string; count: number }[];
  rarities: PublicCardFacetCount[];
  colors: PublicCardFacetCount[];
  foilTypes: PublicCardFacetCount[];
  conditions: PublicCardFacetCount[];
  languages: PublicCardFacetCount[];
  foilCount: number;
  nonFoilCount: number;
}

export interface PublicCardDetail extends PublicCard {
  scanImageUrl: string | null;
  backScanImageUrl: string | null;
}
