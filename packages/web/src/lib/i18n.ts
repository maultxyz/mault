import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/constants/languages";
import { LANGUAGE_STORAGE_KEY } from "@/lib/constants/storage-keys";
import i18n, { type BackendModule } from "i18next";
import { initReactI18next } from "react-i18next";

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
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(stored ?? "")) {
      return stored as SupportedLanguage;
    }
  } catch {
    // Safari can throw on localStorage access (private browsing, storage
    // restrictions) - this runs at module load, before React ever mounts,
    // so an uncaught throw here takes down the whole app with nothing to
    // show for it. Fall through to browser-language detection instead.
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
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // Same storage-restricted environments as above - persistence is a
    // nice-to-have, not required for the language switch itself to work.
  }
});

export default i18n;
