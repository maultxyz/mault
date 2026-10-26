import {
  CARD_LANGUAGES,
  DEFAULT_CARD_LANGUAGE,
} from "./constants/card-language.constant";
import type { CardLanguage } from "./interfaces/card-language.interface";
import type { PlayingCard } from "./interfaces/card.interface";

export function isCardLanguage(value: unknown): value is CardLanguage {
  return CARD_LANGUAGES.includes(value as CardLanguage);
}

export function scanLanguage(scan: {
  language?: string | null;
  card: Pick<PlayingCard, "lang">;
}): string {
  return scan.language || scan.card.lang || DEFAULT_CARD_LANGUAGE;
}
