export const APP_LANGUAGES = ["en", "de", "fr"] as const;

export const DEFAULT_LANGUAGE = "en";

export const LANGUAGE_NAMES: Record<(typeof APP_LANGUAGES)[number], string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
};
