import {
  conditionLabel,
  csvEscape,
  purchasePrice,
} from "./base";
import { MOXFIELD_LANGUAGE_NAMES } from "../constants/card-export.constant";
import type { ExportAdapter } from "../interfaces/card-export.interface";

export const moxfieldAdapter: ExportAdapter = {
  key: "moxfield",
  label: "Moxfield",
  filenameSlug: "moxfield",
  groupBy: "card-foil",
  games: ["mtg"],
  headers: () => [
    "Count",
    "Name",
    "Edition",
    "Condition",
    "Language",
    "Foil",
    "Collector Number",
    "Alter",
    "Proxy",
    "Purchase Price (USD)",
  ],
  row: ({ card, quantity, isFoil, condition, language }) => [
    String(quantity),
    csvEscape(card.name),
    card.set.toUpperCase(),
    conditionLabel(condition),
    MOXFIELD_LANGUAGE_NAMES[language] ?? language.toUpperCase(),
    isFoil ? "foil" : "",
    card.collectorNumber,
    "False",
    "False",
    purchasePrice(card, isFoil),
  ],
};
