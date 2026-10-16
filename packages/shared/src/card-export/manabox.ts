import {
  conditionLabel,
  csvEscape,
  purchasePrice,
} from "./base";
import type { ExportAdapter } from "../interfaces/card-export.interface";

export const manaboxAdapter: ExportAdapter = {
  key: "manabox",
  label: "Manabox",
  filenameSlug: "manabox",
  groupBy: "card-foil",
  games: ["mtg"],
  headers: () => [
    "Name",
    "Set code",
    "Set name",
    "Collector number",
    "Foil",
    "Quantity",
    "Scryfall ID",
    "Condition",
    "Language",
    "Purchase price (USD)",
  ],
  row: ({ card, quantity, isFoil, condition }) => [
    csvEscape(card.name),
    card.set.toUpperCase(),
    csvEscape(card.setName),
    card.collectorNumber,
    isFoil ? "foil" : "",
    String(quantity),
    card.id,
    conditionLabel(condition),
    "en",
    purchasePrice(card, isFoil),
  ],
};
