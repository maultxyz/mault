import type { PlayingCard, Result } from "@magic-vault/shared";

export interface TcgplayerSubTypes {
  price: string[];
  priceFoil: string[];
}

export interface TcgplayerPricing {
  categoryId: number;
  subTypes(card: PlayingCard): TcgplayerSubTypes;
  productIdFromRaw?(card: PlayingCard): string | number | null | undefined;
}

export interface CardSearchAdapter {
  defaultUrl: string;
  // Adapters whose source splits by URL (a different host/path per
  // language, e.g. TCGdex's /v2/{lang}/, or Lorcana's separate DE API) use
  // this. Adapters whose source is a single global endpoint filtered by a
  // query param instead (e.g. Scryfall's `lang:xx`) read the `lang` search()
  // gets directly and ignore this. searchById doesn't take a lang - an id
  // is already print/language-specific once you have it.
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
