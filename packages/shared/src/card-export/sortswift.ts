import { csvEscape, exportEntryKey, finishLabel } from "./base";
import { marketPrice, productLine, tcgplayerId } from "./tcgplayer";
import {
  SORTSWIFT_CONDITION_CODES,
  SORTSWIFT_OVERRIDE_PRICE_HEADERS,
  SORTSWIFT_PRICE_HEADERS,
} from "../constants/card-export.constant";
import { cardPriceFor } from "../price-source";
import type {
  ExportAdapter,
  ExportContext,
  GroupedEntry,
} from "../interfaces/card-export.interface";

function euPrice({ card, isFoil, foilType }: GroupedEntry): string {
  const price = cardPriceFor(card, { isFoil, foilType }, "cardmarket");
  return price != null ? price.toFixed(2) : "";
}

function printing(entry: GroupedEntry, ctx: ExportContext): string {
  const skuVariant = ctx.tcgplayerSkusByEntryKey?.[exportEntryKey(entry)]?.variant;
  return skuVariant ?? finishLabel(entry.isFoil, ctx.isMtg ? null : entry.foilType);
}

export const sortswiftAdapter: ExportAdapter = {
  key: "sortswift",
  label: "Sort Swift",
  filenameSlug: "sortswift",
  groupBy: "card-foil",
  games: "all",
  usesTcgplayerSkus: true,
  headers: () => [
    "Stock Item ID",
    "Game",
    "File Name",
    "Set",
    "Set Code",
    "Card Number",
    "Name",
    "Rarity",
    "Market Price",
    "Low Price",
    "Mid Price",
    "High Price",
    "EU Price",
    "Condition",
    "Language",
    "Printing",
    "Quantity",
    "Comment",
    "Remarks",
    "TCGplayer Id",
    "SKU Id",
    "ID Product",
    "UPC",
    "CDN Image",
    "Card Back CDN Image",
    "Cost",
    "Price",
    ...SORTSWIFT_PRICE_HEADERS,
    ...SORTSWIFT_OVERRIDE_PRICE_HEADERS,
  ],
  row: (entry, ctx) => {
    const skuMatch = ctx.tcgplayerSkusByEntryKey?.[exportEntryKey(entry)];
    const price = marketPrice(entry);
    return [
      "",
      csvEscape(productLine(ctx)),
      "",
      csvEscape(entry.card.setName),
      csvEscape(entry.card.set.toUpperCase()),
      csvEscape(entry.card.collectorNumber ?? ""),
      csvEscape(entry.card.name),
      csvEscape(entry.card.rarity ?? ""),
      price,
      "",
      "",
      "",
      euPrice(entry),
      SORTSWIFT_CONDITION_CODES[entry.condition],
      csvEscape(entry.language.toUpperCase()),
      csvEscape(printing(entry, ctx)),
      String(entry.quantity),
      "",
      "",
      skuMatch?.productId ?? tcgplayerId(entry.card),
      skuMatch?.skuId ?? "",
      "",
      "",
      "",
      "",
      "",
      price,
      ...SORTSWIFT_PRICE_HEADERS.map(() => price),
      ...SORTSWIFT_OVERRIDE_PRICE_HEADERS.map(() => ""),
    ];
  },
};
