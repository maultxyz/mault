import type { PlayingCard } from "../interfaces/card.interface";
import { conditionLabel, csvEscape, exportEntryKey, finishLabel } from "./base";
import { TCGPLAYER_PRODUCT_LINES } from "../constants/card-export.constant";
import { cardPriceFor } from "../price-source";
import type {
  ExportAdapter,
  ExportContext,
  GroupedEntry,
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

function tcgplayerIdForEntry(entry: GroupedEntry, ctx: ExportContext): string {
  return ctx.tcgplayerSkusByEntryKey?.[exportEntryKey(entry)]?.skuId ?? tcgplayerId(entry.card);
}

export function productLine(ctx: ExportContext): string {
  if (!ctx.gameKey) return "";
  return TCGPLAYER_PRODUCT_LINES[ctx.gameKey] ?? ctx.gameName ?? "";
}

function tcgplayerCondition(
  { isFoil, foilType, condition }: GroupedEntry,
  ctx: ExportContext,
): string {
  const label = conditionLabel(condition);
  return isFoil ? `${label} ${finishLabel(true, ctx.isMtg ? null : foilType)}` : label;
}

export function marketPrice({ card, isFoil, foilType }: GroupedEntry): string {
  const price = cardPriceFor(card, { isFoil, foilType }, "tcgplayer");
  return price != null ? price.toFixed(2) : "";
}

export const tcgplayerAdapter: ExportAdapter = {
  key: "tcgplayer",
  label: "TCGPlayer",
  filenameSlug: "tcgplayer",
  groupBy: "card-foil",
  games: "all",
  usesTcgplayerSkus: true,
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
  row: (entry, ctx) => [
    tcgplayerIdForEntry(entry, ctx),
    csvEscape(productLine(ctx)),
    csvEscape(entry.card.setName),
    csvEscape(entry.card.name),
    csvEscape(entry.card.collectorNumber ?? ""),
    csvEscape(entry.card.rarity ?? ""),
    csvEscape(tcgplayerCondition(entry, ctx)),
    String(entry.quantity),
    marketPrice(entry),
  ],
};
