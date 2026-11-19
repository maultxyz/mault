import type { SupportedLanguage } from "@/lib/interfaces/languages";

export const SUPPORTED_LANGUAGES = ["en", "de", "fr"] as const;
export const LANGUAGE_NATIVE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
};

export const EMPTY_LANGUAGES: string[] = [];
