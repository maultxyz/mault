import type {
  CardSearchDiagnostics,
  CardSearchEmbeddings,
  OcrDiagnostics,
  OcrReadout,
  PlayingCard,
  PrintingMarkGroups,
  PrintingMarkMatch,
  PrintingMarkScanGrids,
  SearchCardMatch,
} from "@magic-vault/shared";
import type { SQL } from "drizzle-orm";

export interface PrintingQuery {
  setCode: string | null;
  number: string;
  name?: string;
}

export interface TcgplayerSubTypes {
  price: string[];
  priceFoil: string[];
}

export interface TcgplayerProductCandidate {
  name: string;
  rarity: string | null;
}

export interface TcgplayerProductMatch {
  numbers: string[];
  accepts(product: TcgplayerProductCandidate): boolean;
}

export interface TcgplayerFinishProduct {
  foilType: string;
  productId: number;
  subTypes: string[];
}

export interface TcgplayerStampProduct {
  stamp: string;
  isFoil: boolean;
  productId: number;
  subTypes: string[];
}

export interface TcgplayerPricing {
  categoryId: number;
  foilTypeOfVariant?(variantWithoutEdition: string): string;
  subTypes(card: PlayingCard): TcgplayerSubTypes;
  finishProducts?(card: PlayingCard): TcgplayerFinishProduct[];
  stampProducts?(card: PlayingCard): TcgplayerStampProduct[];
  productIdFromRaw?(card: PlayingCard): string | number | null | undefined;
  productMatch?(card: PlayingCard): TcgplayerProductMatch | null;
}

export interface CardmarketPricing {
  gameId: number;
  siteGamePath?: string;
  productIdFromRaw?(card: PlayingCard): string | number | null | undefined;
  productNames?(card: PlayingCard): string[];
}

export interface CardKingdomPricing {
  scryfallIdFromRaw(card: PlayingCard): string | null | undefined;
}

export interface FoilPrintingVariants {
  isSameArtwork(card: PlayingCard, other: PlayingCard): boolean;
  matchesFoilType(card: PlayingCard, foilType: string | null): boolean;
}

export interface CardSearchAdapter {
  defaultUrl: string;
  urlForLang?(lang: string): string;
  normalizeStored(raw: unknown, id: string, lang: string): PlayingCard | null;
  rarePrintingSql?: SQL;
  promoPrintingSql?: SQL;
  printedSetTotalSql?: SQL;
  excludedFromMatchingSql?: SQL;
  ocrMatchesByPrintedSetAndNumber?: boolean;
  readPrintedPromoMarker?(setLine: string): boolean | null;
  printingMarkGroups?(card: PlayingCard): PrintingMarkGroups;
  foilPrintingVariants?: FoilPrintingVariants;
  sourceListsNonFoilPrinting?(card: PlayingCard): boolean;
  sourceListsOnlyNonFoilPrinting?(card: PlayingCard): boolean;
  tcgplayer?: TcgplayerPricing;
  cardmarket?: CardmarketPricing;
  cardkingdom?: CardKingdomPricing;
}

export interface ResolvedCardSearch {
  adapter: CardSearchAdapter;
  gameKey: string;
  baseUrl: string;
  lang: string;
  searchAllLanguages?: boolean;
  onlyLanguage?: string;
}

export interface CollectionMatchScope {
  gameKey: string;
  lang: string;
  matchAllLanguages: boolean;
}

export interface SyncSourceCard {
  id: string;
  name: string;
  setCode: string;
  imageUrl: string | undefined;
  printingMarkImageUrl?: string;
  fallbackImageUrl?: string;
  backImageUrl?: string;
  data: string;
}

export type SyncSourceCardDetail = Omit<SyncSourceCard, "id">;

export interface FetchOneResult {
  card: SyncSourceCardDetail | null;
  urls: string[];
}

export interface SyncSource {
  gameKey: string;
  label: string;
  defaultUrl: string;
  fetchHeaders: Record<string, string>;
  languages: string[];
  volatileDataKeys?: string[];
  fetchCards(
    baseUrl: string,
    addLog: (msg: string) => void,
    lang?: string,
    signal?: AbortSignal,
  ): Promise<SyncSourceCard[]>;
  fetchOne(id: string, baseUrl: string, lang?: string): Promise<FetchOneResult>;
}

export interface TextRankedPrintingEvidence {
  isPreferredSet: boolean;
  matchesPrintedPromo: boolean;
  setLineMatch: boolean;
  letteredNumberMatch: boolean;
  numberMatch: boolean;
  setTotalMatch: boolean;
  rarePrinting: boolean;
  distance: number;
}

export interface CardMatchCandidate {
  cardId: string;
  lang: string;
  name: string;
  setCode: string;
  rarePrinting: boolean;
  distance: number;
  leaderDistance: number;
}

export interface CardMatchSearchResult {
  message: string;
  success: true;
  data: SearchCardMatch[] | null;
  nearestDistance: number | null;
  diagnostics?: CardSearchDiagnostics;
  printingMarks?: PrintingMarkMatch | null;
}

export interface CardTextMatchParams {
  gameKey: string;
  lang: string;
  matchAllLanguages: boolean;
  embeddings: CardSearchEmbeddings;
  readout: OcrReadout;
  preferredSetCodes?: string[];
  printedPromo?: boolean | null;
  printingMarkGrids?: PrintingMarkScanGrids | null;
}

export interface CardTextMatchResult extends CardMatchSearchResult {
  ocr: OcrDiagnostics;
}

export interface OrientedCardMatch {
  embedding: number[];
  result: CardMatchSearchResult;
}
