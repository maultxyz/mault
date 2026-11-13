import type { PlayingCard } from "../interfaces/card.interface";
import { conditionLabel, csvEscape, exportEntryKey, finishLabel } from "./base";
import { TCGPLAYER_PRODUCT_LINES } from "../constants/card-export.constant";
import { cardPriceFor } from "../price-source";
import type {
  ExportAdapter,
  ExportContext,
  GroupedEntry,
  TcgplayerSkuMatch,
} from "../interfaces/card-export.interface";

export function tcgplayerId(card: PlayingCard): string {
  if (card.tcgplayerId) return card.tcgplayerId;
  const raw = card.raw as
    | {
        tcgplayer_id?: string | number | null;
        printing?: { tcgplayer_product_id?: string | null };
      }
    | undefined;
  const legacyId =
    raw?.tcgplayer_id ?? raw?.printing?.tcgplayer_product_id ?? null;
  return legacyId != null ? String(legacyId) : "";
}

function skuMatchFor(entry: GroupedEntry, ctx: ExportContext): TcgplayerSkuMatch | undefined {
  return ctx.tcgplayerSkusByEntryKey?.[exportEntryKey(entry)];
}

function tcgplayerIdForEntry(entry: GroupedEntry, ctx: ExportContext): string {
  return skuMatchFor(entry, ctx)?.skuId ?? "";
}

export function productLine(ctx: ExportContext): string {
  if (!ctx.gameKey) return "";
  return TCGPLAYER_PRODUCT_LINES[ctx.gameKey] ?? ctx.gameName ?? "";
}

function tcgplayerCondition(entry: GroupedEntry, ctx: ExportContext): string {
  const skuMatch = skuMatchFor(entry, ctx);
  const isFoil = skuMatch?.skuId ? skuMatch.isFoilVariant : entry.isFoil;
  const label = conditionLabel(entry.condition);
  return isFoil ? `${label} ${finishLabel(true, ctx.isMtg ? null : entry.foilType)}` : label;
}

export function marketPrice({ card, isFoil, foilType }: GroupedEntry): string {
  const price = cardPriceFor(card, { isFoil, foilType }, "tcgplayer");
  return price != null ? price.toFixed(2) : "";
}

function tcgplayerMarketPrice(entry: GroupedEntry, ctx: ExportContext): string {
  const skuPrice = skuMatchFor(entry, ctx)?.marketPrice;
  return skuPrice != null ? skuPrice.toFixed(2) : marketPrice(entry);
}

export const tcgplayerAdapter: ExportAdapter = {
  key: "tcgplayer",
  label: "TCGPlayer",
  filenameSlug: "tcgplayer",
  groupBy: "card-foil",
  games: "all",
  usesTcgplayerSkus: true,
  rowKey: (entry, ctx) => tcgplayerIdForEntry(entry, ctx) || exportEntryKey(entry),
  headers: () => [
    "TCGplayer Id",
    "Product Line",
    "Set Name",
    "Product Name",
    "Number",
    "Rarity",
    "Condition",
    "Add to Quantity",
    "TCG Marketplace Price",
  ],
  row: (entry, ctx) => {
    const product = skuMatchFor(entry, ctx)?.product;
    return [
      tcgplayerIdForEntry(entry, ctx),
      csvEscape(productLine(ctx)),
      csvEscape(product?.setName ?? entry.card.setName),
      csvEscape(product?.name ?? entry.card.name),
      csvEscape(product ? (product.number ?? "") : (entry.card.collectorNumber ?? "")),
      csvEscape(product?.rarity ?? entry.card.rarity ?? ""),
      csvEscape(tcgplayerCondition(entry, ctx)),
      String(entry.quantity),
      tcgplayerMarketPrice(entry, ctx),
    ];
  },
};
