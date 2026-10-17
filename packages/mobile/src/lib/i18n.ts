import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { APP_LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/constants/i18n";
import { LANGUAGE_PREFERENCE_KEY } from "@/lib/constants/storage-keys";
import type { AppLanguage, LanguagePreference } from "@/lib/interfaces/i18n";
import { readKv, writeKv } from "@/lib/storage/kv";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

function deviceLanguage(): AppLanguage {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    return APP_LANGUAGES.find((lang) => locale === lang || locale.startsWith(`${lang}-`)) ?? DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function readLanguagePreference(): LanguagePreference {
  const stored = readKv(LANGUAGE_PREFERENCE_KEY);
  return APP_LANGUAGES.find((lang) => lang === stored) ?? "system";
}

function resolveLanguage(preference: LanguagePreference): AppLanguage {
  return preference === "system" ? deviceLanguage() : preference;
}

export function saveLanguagePreference(preference: LanguagePreference): void {
  writeKv(LANGUAGE_PREFERENCE_KEY, preference === "system" ? null : preference);
  void i18n.changeLanguage(resolveLanguage(preference));
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de }, fr: { translation: fr } },
  lng: resolveLanguage(readLanguagePreference()),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

export default i18n;
