import type { CARD_PRICE_AT_SCAN_KEYS } from "../constants/price-source.constant";
import type { PriceSource } from "./price-source.interface";

export type CardPriceHistoryPriceKey = (typeof CARD_PRICE_AT_SCAN_KEYS)[number];

export type CardPriceHistoryPoint = { day: string } & Record<CardPriceHistoryPriceKey, number | null>;

export interface CardPriceHistory {
  points: CardPriceHistoryPoint[];
}

export interface CardPriceHistorySeriesOptions {
  source: PriceSource;
  isFoil: boolean;
  rangeDays: number;
  today: string;
}

export interface CardPriceHistoryDay {
  day: string;
  value: number;
}

export interface CardPriceHistorySeries {
  days: CardPriceHistoryDay[];
  isFoilPrice: boolean;
  currentPriceSinceDay: string | null;
}
