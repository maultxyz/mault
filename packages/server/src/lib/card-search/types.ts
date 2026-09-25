import type { PlayingCard, Result } from "@magic-vault/shared";

// Which of a TCGplayer product's price sub-types (tcgcsv's `subTypeName`,
// e.g. "Normal", "Foil", "Rainbow Foil") feed a card's `price` and
// `priceFoil`, in order of preference.
export interface TcgplayerSubTypes {
  price: string[];
  priceFoil: string[];
}

export interface TcgplayerPricing {
  categoryId: number;
  subTypes(card: PlayingCard): TcgplayerSubTypes;
  // Reads the product id from `card.raw` for cards saved to scan history
  // before this game's adapter set `PlayingCard.tcgplayerId`.
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
  // Builds a card from the source API object the sync job stored in
  // `cards.data` for printing `id`. Null when that object has no such
  // printing.
  normalizeStored(raw: unknown, id: string, lang: string): PlayingCard | null;
  // Present for games whose cards carry a TCGplayer product id
  // (`PlayingCard.tcgplayerId`), so the daily tcgcsv price sync covers them.
  tcgplayer?: TcgplayerPricing;
}
