import {
  CARD_SEARCH_ALL_LANGUAGES,
  isCardLanguage,
  type Collection,
} from "@magic-vault/shared";

export function defaultCardSearchLanguage(
  collection: Pick<Collection, "lang" | "matchAllLanguages"> | undefined,
): string {
  if (!collection || collection.matchAllLanguages) return CARD_SEARCH_ALL_LANGUAGES;
  return isCardLanguage(collection.lang) ? collection.lang : CARD_SEARCH_ALL_LANGUAGES;
}
