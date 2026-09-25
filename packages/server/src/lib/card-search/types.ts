import type { PlayingCard, Result } from "@magic-vault/shared";

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
}

export interface ResolvedCardSearch {
  adapter: CardSearchAdapter;
  gameKey: string;
  baseUrl: string;
  lang: string;
}
