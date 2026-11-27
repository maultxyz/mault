import type { CardCondition, OrgPricing } from "./card-condition.interface";
import type { FieldMeta } from "./sort-bins.interface";
import type { PlayingCardWithDistance } from "./card.interface";
import type { ScannedCard } from "./scanner.interface";

export interface TcgplayerProductDetails {
  name: string;
  setName: string | null;
  number: string | null;
  rarity: string | null;
}

export interface TcgplayerSkuMatch {
  productId: string;
  variant: string | null;
  skuId: string | null;
  marketPrice: number | null;
  product: TcgplayerProductDetails | null;
}

export interface ExportContext {
  isMtg: boolean;
  fieldDefinitions: FieldMeta[];
  gameKey?: string;
  gameName?: string;
  tcgplayerSkusByEntryKey?: Record<string, TcgplayerSkuMatch>;
  pricing?: OrgPricing;
}

export interface GroupedEntry {
  card: PlayingCardWithDistance;
  quantity: number;
  isFoil: boolean;
  foilType?: string;
  stamp?: string;
  condition: CardCondition;
  language: string;
  binNumber?: number;
}

export type GroupBy = "card" | "card-foil";

export type ExportableCard = Pick<ScannedCard, "card" | "isFoil" | "foilType" | "stamp" | "condition" | "language"> &
  Partial<Pick<ScannedCard, "scannedAt" | "binNumber">>;

export interface ExportAdapter {
  key: string;
  label: string;
  filenameSlug: string;
  groupBy: GroupBy;
  games: "all" | string[];
  usesTcgplayerSkus?: boolean;
  exportsEachCopyInScanOrder?: boolean;
  rowKey?: (entry: GroupedEntry, ctx: ExportContext) => string;
  headers: (ctx: ExportContext) => string[];
  row: (entry: GroupedEntry, ctx: ExportContext, rowIndex: number) => string[];
}
