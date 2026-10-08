import type {
  CardSearchDiagnostics,
  OcrDiagnostics,
  PlayingCard,
  Result,
  SearchCardMatch,
} from "@magic-vault/shared";

export interface PrintingQuery {
  setCode: string | null;
  number: string;
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

export interface TcgplayerPricing {
  categoryId: number;
  subTypes(card: PlayingCard): TcgplayerSubTypes;
  productIdFromRaw?(card: PlayingCard): string | number | null | undefined;
  productMatch?(card: PlayingCard): TcgplayerProductMatch | null;
}

export interface CardmarketPricing {
  gameId: number;
  productIdFromRaw?(card: PlayingCard): string | number | null | undefined;
  productNames?(card: PlayingCard): string[];
}

export interface CardKingdomPricing {
  scryfallIdFromRaw(card: PlayingCard): string | null | undefined;
}

export interface CardSearchAdapter {
  defaultUrl: string;
  urlForLang?(lang: string): string;
  search(
    query: string,
    baseUrl: string,
    lang: string,
  ): Promise<Result<PlayingCard[]>>;
  searchById(id: string, baseUrl: string): Promise<Result<PlayingCard>>;
  normalizeStored(raw: unknown, id: string, lang: string): PlayingCard | null;
  tcgplayer?: TcgplayerPricing;
  cardmarket?: CardmarketPricing;
  cardkingdom?: CardKingdomPricing;
}

export interface ResolvedCardSearch {
  adapter: CardSearchAdapter;
  gameKey: string;
  baseUrl: string;
  lang: string;
}

export interface SyncSourceCard {
  id: string;
  name: string;
  setCode: string;
  imageUrl: string | undefined;
  data: string;
}

export type SyncSourceCardDetail = Omit<SyncSourceCard, "id">;

// `urls` is every request fetchOne actually made while looking for the card
// - one entry for a direct by-id lookup, several for an adapter (onepiece)
// that has to page through a listing since the source has no direct
// by-id endpoint at this granularity. Populated whether or not `card` was
// found, so a caller can report exactly what was queried on a miss.
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
  fetchCards(
    baseUrl: string,
    addLog: (msg: string) => void,
    lang?: string,
    signal?: AbortSignal,
  ): Promise<SyncSourceCard[]>;
  fetchOne(id: string, baseUrl: string, lang?: string): Promise<FetchOneResult>;
}

export interface CardMatchSearchResult {
  message: string;
  success: true;
  data: SearchCardMatch[] | null;
  nearestDistance: number | null;
  diagnostics?: CardSearchDiagnostics;
}

export interface CardTextMatchResult extends CardMatchSearchResult {
  ocr: OcrDiagnostics;
}
