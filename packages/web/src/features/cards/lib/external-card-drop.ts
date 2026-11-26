import {
  EXTERNAL_CARD_DROP_DATA_TYPES,
  EXTERNAL_CARD_NAME_MAX_LENGTH,
  EXTERNAL_CARD_SOURCE_HOSTS,
} from "@/lib/constants/cards";
import { parseDeckLinkUrl } from "@magic-vault/shared";
import type {
  ExternalCardDropData,
  ExternalCardReference,
} from "@/lib/interfaces/cards";

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const SCRYFALL_CARD_PAGE_PATTERN = /^\/card\/([^/]+)\/([^/]+)(?:\/([^/]+))?/;
const LEADING_QUANTITY_PATTERN = /^\d+x?\s+/i;

export function isExternalCardDrag(types: readonly string[]): boolean {
  return EXTERNAL_CARD_DROP_DATA_TYPES.some((type) => types.includes(type));
}

export function findDroppedDeckLink(data: ExternalCardDropData): string | null {
  const urls = [
    ...readUriList(data.uriList),
    ...readPlainTextUrls(data.plainText),
    ...readHtmlParts(data.html).urls,
  ];
  return urls.find((url) => parseDeckLinkUrl(url)) ?? null;
}

export function parseExternalCardDrop(
  data: ExternalCardDropData,
): ExternalCardReference[] {
  const htmlParts = readHtmlParts(data.html);
  const listedUrls = uniqueValues([
    ...readUriList(data.uriList),
    ...readPlainTextUrls(data.plainText),
  ]);
  const listedReferences = listedUrls.flatMap((url) => {
    const reference = referenceFromUrl(url);
    return reference ? [reference] : [];
  });
  if (listedReferences.length > 1) {
    return listedReferences.filter(hasCardDetails);
  }
  const references = [
    ...listedReferences,
    ...htmlParts.urls.flatMap((url) => {
      const reference = referenceFromUrl(url);
      return reference ? [reference] : [];
    }),
  ];
  if (references.length === 0) return [];
  const merged = mergeReferences(references);
  const reference = { ...merged, name: htmlParts.names[0] ?? merged.name };
  return hasCardDetails(reference) ? [reference] : [];
}

function readUriList(uriList: string): string[] {
  return uriList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function readPlainTextUrls(plainText: string): string[] {
  const trimmed = plainText.trim();
  return /^https?:\/\/\S+$/i.test(trimmed) ? [trimmed] : [];
}

function readHtmlParts(html: string): { urls: string[]; names: string[] } {
  if (!html.trim()) return { urls: [], names: [] };
  const document = new DOMParser().parseFromString(html, "text/html");
  const urls: string[] = [];
  const names: string[] = [];
  document.querySelectorAll("img, a").forEach((element) => {
    const url = element.getAttribute("src") ?? element.getAttribute("href");
    if (url) urls.push(url);
    const nameCandidates = [
      element.getAttribute("alt"),
      element.getAttribute("title"),
      element.tagName === "A" ? element.textContent : null,
    ];
    for (const candidate of nameCandidates) {
      const name = cleanCardName(candidate);
      if (name) names.push(name);
    }
  });
  return { urls: uniqueValues(urls), names };
}

function referenceFromUrl(value: string): ExternalCardReference | null {
  const url = parseUrl(value);
  if (!url || !isExternalCardSourceUrl(url)) return null;
  const reference: ExternalCardReference = {};
  const scryfallPage = url.hostname.endsWith("scryfall.com")
    ? SCRYFALL_CARD_PAGE_PATTERN.exec(url.pathname)
    : null;
  if (scryfallPage) {
    reference.setCode = decodeURIComponent(scryfallPage[1]).toLowerCase();
    reference.collectorNumber = decodeURIComponent(scryfallPage[2]);
    if (scryfallPage[3]) {
      reference.name = cleanCardName(
        decodeURIComponent(scryfallPage[3]).replace(/-/g, " "),
      );
    }
  }
  const scryfallId = UUID_PATTERN.exec(url.pathname)?.[0];
  if (scryfallId) reference.scryfallId = scryfallId.toLowerCase();
  const queryName = cleanCardName(url.searchParams.get("name"));
  if (queryName) reference.name = queryName;
  return reference;
}

function hasCardDetails(reference: ExternalCardReference): boolean {
  return Object.values(reference).some((value) => !!value);
}

function isExternalCardSourceUrl(url: URL): boolean {
  return EXTERNAL_CARD_SOURCE_HOSTS.some(
    ({ hostname, pathPrefix }) =>
      (url.hostname === hostname || url.hostname.endsWith(`.${hostname}`)) &&
      (!pathPrefix || url.pathname.startsWith(pathPrefix)),
  );
}

function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function cleanCardName(value: string | null | undefined): string | undefined {
  const name = value
    ?.replace(/\s+/g, " ")
    .trim()
    .replace(LEADING_QUANTITY_PATTERN, "");
  if (!name || name.length > EXTERNAL_CARD_NAME_MAX_LENGTH) return undefined;
  if (parseUrl(name)) return undefined;
  return name;
}

function mergeReferences(
  references: ExternalCardReference[],
): ExternalCardReference {
  return references.reduce<ExternalCardReference>(
    (merged, reference) => ({
      scryfallId: merged.scryfallId ?? reference.scryfallId,
      setCode: merged.setCode ?? reference.setCode,
      collectorNumber: merged.collectorNumber ?? reference.collectorNumber,
      name: merged.name ?? reference.name,
    }),
    {},
  );
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}
