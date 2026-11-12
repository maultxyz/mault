import {
  CARD_LANGUAGES,
  DEFAULT_CARD_LANGUAGE,
} from "./constants/card-language.constant";
import {
  OCR_REGIONS_BY_GAME_KEY,
  PRINTED_LANGUAGE_CODES_BY_GAME_KEY,
} from "./constants/ocr-regions.constant";
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

export function cardSearchResultKey(card: Pick<PlayingCard, "id" | "lang">): string {
  return `${card.id}:${card.lang ?? ""}`;
}

export function cardSearchResultLabel(
  card: Pick<PlayingCard, "set" | "collectorNumber" | "lang">,
): string {
  const printing = `${card.set.toUpperCase()} #${card.collectorNumber}`;
  return card.lang ? `${printing} · ${card.lang.toUpperCase()}` : printing;
}

export function pickedCardLanguage(card: Pick<PlayingCard, "lang">): CardLanguage | null {
  return isCardLanguage(card.lang) ? card.lang : null;
}

export function gameReadsPrintedLanguage(gameKey: string): boolean {
  return (OCR_REGIONS_BY_GAME_KEY[gameKey] ?? []).some(
    (region) => region.field === "language",
  );
}

export function readPrintedLanguage(
  gameKey: string,
  languageLineText: string,
): string | null {
  const catalogLanguageByPrintedCode =
    PRINTED_LANGUAGE_CODES_BY_GAME_KEY[gameKey] ?? {};
  for (const token of languageLineText.split(/[^A-Za-z]+/)) {
    const catalogLanguage = catalogLanguageByPrintedCode[token];
    if (catalogLanguage) return catalogLanguage;
  }
  return null;
}
