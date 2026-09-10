// Every language the card-search APIs may return, for display purposes
// (game coverage lists, card filters, etc).
export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  de: "German",
  ja: "Japanese",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  "pt-br": "Portuguese (Brazil)",
  "pt-pt": "Portuguese (Portugal)",
  ru: "Russian",
  "zh-tw": "Chinese (Traditional)",
  "zh-cn": "Chinese (Simplified)",
  ko: "Korean",
  nl: "Dutch",
  id: "Indonesian",
  th: "Thai",
  lo: "Lao",
  zht: "Chinese (Traditional)",
  zhs: "Chinese (Simplified)",
};

// The languages the app's own UI is translated into (see src/locales) — a
// much smaller set than LANGUAGE_LABELS, which covers card-source languages.
export const SUPPORTED_LANGUAGES = ["en", "de", "fr"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NATIVE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
};

// Stable empty-array reference for a "no languages loaded yet" default prop,
// so consumers can use it directly as a dependency/default without creating
// a new array (and re-render) every render.
export const EMPTY_LANGUAGES: string[] = [];
