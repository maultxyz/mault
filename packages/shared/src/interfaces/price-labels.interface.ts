import type {
  PRICE_LABEL_ROUNDING_MODES,
  PRICE_LABEL_SOURCES,
} from "../constants/price-labels.constant";
import type { CardCondition } from "./card-condition.interface";

export type PriceLabelSource = (typeof PRICE_LABEL_SOURCES)[number];

export type PriceLabelRoundingMode = (typeof PRICE_LABEL_ROUNDING_MODES)[number];

export interface PriceLabelPricing {
  markupPercent: number;
  rounding: PriceLabelRoundingMode;
}

export interface PriceLabelCard {
  scanId: string;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  isFoil: boolean;
  foilType: string | null;
  condition: CardCondition;
  language: string | null;
  marketPrice: number | null;
}

export interface PriceLabelCardsResponse {
  sourceName: string;
  currency: string;
  total: number;
  cards: PriceLabelCard[];
}
