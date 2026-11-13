import { z } from "zod";
import {
  PUBLIC_CARD_FILTER_VALUE_MAX_LENGTH,
  PUBLIC_CARD_FILTER_VALUES_MAX,
  PUBLIC_CARD_FINISHES,
} from "../constants/public-cards.constant";

const filterValues = z
  .array(z.string().max(PUBLIC_CARD_FILTER_VALUE_MAX_LENGTH))
  .max(PUBLIC_CARD_FILTER_VALUES_MAX)
  .default([]);

const priceBound = z.number().finite().min(0).nullable().default(null);

export const publicCardFiltersSchema = z.object({
  sets: filterValues,
  rarities: filterValues,
  colors: filterValues,
  foilTypes: filterValues,
  conditions: filterValues,
  languages: filterValues,
  finish: z.enum(PUBLIC_CARD_FINISHES).default("all"),
  minPrice: priceBound,
  maxPrice: priceBound,
});
