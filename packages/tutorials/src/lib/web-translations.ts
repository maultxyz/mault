import { readFileSync } from "node:fs";
import path from "node:path";
import { WEB_LOCALES_DIRECTORY } from "./constants/tutorial-paths";
import type { TutorialLanguage } from "./interfaces/tutorial";

type TranslationTree = { [key: string]: string | TranslationTree };

const namespaceCache = new Map<string, TranslationTree>();

function loadNamespace(language: TutorialLanguage, namespace: string): TranslationTree {
  const cacheKey = `${language}:${namespace}`;
  const cached = namespaceCache.get(cacheKey);
  if (cached) return cached;
  const filePath = path.join(WEB_LOCALES_DIRECTORY, language, `${namespace}.json`);
  const tree = JSON.parse(readFileSync(filePath, "utf8")) as TranslationTree;
  namespaceCache.set(cacheKey, tree);
  return tree;
}

function lookUp(tree: TranslationTree, dottedKey: string): string | undefined {
  let node: string | TranslationTree | undefined = tree;
  for (const segment of dottedKey.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[segment];
  }
  return typeof node === "string" ? node : undefined;
}

export function translateWebString(
  language: TutorialLanguage,
  translationKey: string,
  interpolationValues: Record<string, string | number> = {},
): string {
  const separatorIndex = translationKey.indexOf(":");
  if (separatorIndex < 1) {
    throw new Error(`Web translation key "${translationKey}" must look like "namespace:path.to.key".`);
  }
  const namespace = translationKey.slice(0, separatorIndex);
  const dottedKey = translationKey.slice(separatorIndex + 1);
  const tree = loadNamespace(language, namespace);
  const count = interpolationValues.count;
  const pluralKey =
    typeof count === "number"
      ? `${dottedKey}_${new Intl.PluralRules(language).select(count)}`
      : null;
  const template =
    (pluralKey ? lookUp(tree, pluralKey) : undefined) ?? lookUp(tree, dottedKey);
  if (template === undefined) {
    throw new Error(`Web translation "${translationKey}" was not found for language "${language}".`);
  }
  return template.replace(/\{\{\s*(\w+)(?:\s*,\s*\w+)?\s*\}\}/g, (match, name: string) =>
    name in interpolationValues ? String(interpolationValues[name]) : match,
  );
}
