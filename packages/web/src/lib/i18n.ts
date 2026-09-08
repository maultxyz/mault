import i18n, { type BackendModule } from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LANGUAGES = ["en", "de", "fr"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NATIVE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
};

const LANGUAGE_STORAGE_KEY = "language";

const NAMESPACE_FILE_NAMES: Record<string, string> = {
  discordBot: "discord-bot",
};

const localeModules = import.meta.glob<{ default: Record<string, unknown> }>(
  "../locales/*/*.json",
);

const FILE_NAME_TO_NAMESPACE = Object.fromEntries(
  Object.entries(NAMESPACE_FILE_NAMES).map(([ns, fileName]) => [fileName, ns]),
);

const ALL_NAMESPACES = Object.keys(localeModules)
  .filter((path) => path.startsWith("../locales/en/"))
  .map((path) => path.slice("../locales/en/".length, -".json".length))
  .map((fileName) => FILE_NAME_TO_NAMESPACE[fileName] ?? fileName);

const lazyJsonBackend: BackendModule = {
  type: "backend",
  init() {},
  read(language, namespace, callback) {
    const fileName = NAMESPACE_FILE_NAMES[namespace] ?? namespace;
    const key = `../locales/${language}/${fileName}.json`;
    const loader = localeModules[key];
    if (!loader) {
      callback(new Error(`Missing locale file: ${key}`), null);
      return;
    }
    loader()
      .then((mod) => callback(null, mod.default))
      .catch((err) => callback(err, null));
  },
};

function getInitialLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(stored ?? "")) {
    return stored as SupportedLanguage;
  }
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith("de")) return "de";
  if (browserLang.startsWith("fr")) return "fr";
  return "en";
}

void i18n
  .use(lazyJsonBackend)
  .use(initReactI18next)
  .init({
    lng: getInitialLanguage(),
    fallbackLng: "en",
    ns: ALL_NAMESPACES,
    defaultNS: "common",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
});

export default i18n;
