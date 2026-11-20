import { conditionLabel, csvEscape } from "./base";
import {
  skuMatchFor,
  tcgplayerId,
  tcgplayerMarketPrice,
  tcgplayerPrinting,
} from "./tcgplayer";
import { CARD_LANGUAGE_NAMES } from "../constants/card-export.constant";
import type { ExportAdapter } from "../interfaces/card-export.interface";

export const tcgQuickShipAdapter: ExportAdapter = {
  key: "tcg-quick-ship",
  label: "TCG Quick Ship",
  filenameSlug: "tcg-quick-ship",
  groupBy: "card-foil",
  games: "all",
  usesTcgplayerSkus: true,
  exportsEachCopyInScanOrder: true,
  headers: () => [
    "Card Name",
    "Card #",
    "Condition",
    "Printing",
    "Language",
    "Rarity",
    "Listing Price",
    "Qty",
    "Import Sequence",
    "Bin",
    "Set Name",
    "TCGplayer ID",
  ],
  row: (entry, ctx, rowIndex) => {
    const skuMatch = skuMatchFor(entry, ctx);
    const product = skuMatch?.product;
    return [
      csvEscape(product?.name ?? entry.card.name),
      csvEscape(product ? (product.number ?? "") : (entry.card.collectorNumber ?? "")),
      csvEscape(conditionLabel(entry.condition)),
      csvEscape(tcgplayerPrinting(entry, ctx)),
      csvEscape(CARD_LANGUAGE_NAMES[entry.language] ?? entry.language.toUpperCase()),
      csvEscape(product?.rarity ?? entry.card.rarity ?? ""),
      tcgplayerMarketPrice(entry, ctx),
      String(entry.quantity),
      String(rowIndex + 1),
      entry.binNumber != null ? `Bin${entry.binNumber}` : "",
      csvEscape(product?.setName ?? entry.card.setName),
      skuMatch?.productId ?? tcgplayerId(entry.card),
    ];
  },
};
