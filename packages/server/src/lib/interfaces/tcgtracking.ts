import type { PlayingCard } from "@magic-vault/shared";

export interface TcgtrackingSet {
  id: number;
  name: string;
  abbreviation: string | null;
  product_count: number;
  published_on: string | null;
  products_modified?: string | null;
  skus_modified?: string | null;
  sku_count?: number | null;
}

export interface TcgtrackingProduct {
  id: number;
  name: string;
  number: string | null;
  rarity: string | null;
  ext_data: Record<string, unknown> | null;
  image_url: string | null;
  scryfall_id?: string | null;
  cardmarket_id?: number | null;
}

export interface TcgtrackingProductLookup {
  success: boolean;
  product: {
    category_id: number;
    group_id: number;
    set_name: string;
    set_abbr: string | null;
    set_released: string | null;
  };
}

export interface TcgtrackingCatalogSet {
  id: number;
  name: string;
  abbreviation: string | null;
  published_on?: string | null;
}

export interface TcgtrackingCatalogEntry {
  product: TcgtrackingProduct;
  set: TcgtrackingCatalogSet;
}

export interface TcgtrackingFallbackData {
  source: "tcgtracking";
  product: TcgtrackingProduct;
  tcgtrackingSet?: TcgtrackingCatalogSet;
  primarySetCode?: string;
  primarySetName?: string;
  supersededByCardId?: string;
  [primaryShapedField: string]: unknown;
}

export interface TcgtrackingFinishProduct {
  foilType: string;
  productId: number;
}

export interface TcgtrackingPrimarySet {
  code: string;
  name?: string;
}

export interface TcgtrackingPrimaryShapedFieldsInput {
  name: string;
  collectorNumber: string;
  product: TcgtrackingProduct;
  ext: Record<string, unknown>;
  setCode: string;
  tcgtrackingSetName: string;
  primarySetName?: string;
}

export type TcgtrackingNumbering = "global" | "per-set" | "name-only";

export interface TcgtrackingGameConfig {
  numbering: TcgtrackingNumbering;
  fallbacks?: boolean;
  numberKeyOf?(card: PlayingCard): string | null;
  isBasePrinting?(card: PlayingCard): boolean;
  productMatchesParallelPrinting?(
    card: PlayingCard,
    product: TcgtrackingProduct,
  ): boolean;
  primaryCardIdOf?(product: TcgtrackingProduct): string | null;
  comparableProductName?(name: string): string;
  colorIdentityOf?(colors: string[]): string[];
  primaryShapedFieldsOf?(
    input: TcgtrackingPrimaryShapedFieldsInput,
  ): Record<string, unknown>;
  normalizesFallbackThroughPrimaryAdapter?: boolean;
  productNumberKeyOf?(
    product: TcgtrackingProduct,
    setProducts: TcgtrackingProduct[],
  ): string | null;
  finishProductsOf?(
    product: TcgtrackingProduct,
    setProducts: TcgtrackingProduct[],
  ): TcgtrackingFinishProduct[];
  alignsSetsByName?: boolean;
}

export interface TcgtrackingPrimaryCard {
  id: string;
  card: Pick<PlayingCard, "set" | "setName">;
  productId: number | null;
  isBasePrinting: boolean;
  numberKey: string | null;
  nameKey: string;
  baseNameKey: string;
}

export interface TcgtrackingSkuEntry {
  cnd: string;
  var: string;
  lng: string;
  mkt?: number | null;
  low?: number | null;
}

export interface TcgtrackingSetSkusResponse {
  products: Record<string, Record<string, TcgtrackingSkuEntry>>;
}

export interface TcgtrackingSku {
  skuId: string;
  condition: string;
  variant: string;
  language: string;
  marketPrice: number | null;
}

export interface TcgplayerSkuSyncResult {
  skipped: boolean;
  sets: number;
  skuRows: number;
  failedSets: number;
}
