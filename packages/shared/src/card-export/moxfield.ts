import {
  conditionLabel,
  csvEscape,
  purchasePrice,
} from "./base";
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
  row: ({ card, quantity, isFoil, condition }) => [
    String(quantity),
    csvEscape(card.name),
    card.set.toUpperCase(),
    conditionLabel(condition),
    "EN",
    isFoil ? "foil" : "",
    card.collectorNumber,
    "False",
    "False",
    purchasePrice(card, isFoil),
  ],
};
