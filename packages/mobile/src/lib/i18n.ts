import { formatCompactNumber } from "@magic-vault/shared";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  APP_LANGUAGES,
  COMPACT_NUMBER_I18N_FORMAT,
  DEFAULT_LANGUAGE,
  TRANSLATION_NAMESPACE,
} from "@/lib/constants/i18n";
import { LANGUAGE_PREFERENCE_KEY } from "@/lib/constants/storage-keys";
import type { AppLanguage, LanguagePreference } from "@/lib/interfaces/i18n";
import { readKv, writeKv } from "@/lib/storage/kv";
import en from "@/locales/en.json";

function loadTranslations(language: AppLanguage): typeof en {
  if (language === "de") return require("../locales/de.json") as typeof en;
  if (language === "fr") return require("../locales/fr.json") as typeof en;
  return en;
}

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
  const language = resolveLanguage(preference);
  if (!i18n.hasResourceBundle(language, TRANSLATION_NAMESPACE)) {
    i18n.addResourceBundle(language, TRANSLATION_NAMESPACE, loadTranslations(language));
  }
  void i18n.changeLanguage(language);
}

const initialLanguage = resolveLanguage(readLanguagePreference());

void i18n.use(initReactI18next).init({
  resources: {
    [DEFAULT_LANGUAGE]: { [TRANSLATION_NAMESPACE]: loadTranslations(DEFAULT_LANGUAGE) },
    [initialLanguage]: { [TRANSLATION_NAMESPACE]: loadTranslations(initialLanguage) },
  },
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

i18n.services.formatter?.add(COMPACT_NUMBER_I18N_FORMAT, (value: number, lng?: string) => formatCompactNumber(value, lng));

export default i18n;
