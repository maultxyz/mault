import {
  SHARED_CARD_PATH_PREFIX,
  SHARED_STORAGE_PATH_PREFIX,
  SHARE_LINK_TOKEN_PARAM,
  SHORT_LINK_PATH_PREFIX,
  WATCH_PATH_PREFIX,
} from "./constants/monitor-links.constant";
import { SHOP_CATALOG_PATH_PREFIX } from "./constants/shop-catalogs.constant";
import type {
  ParsedShareLinkUrl,
  ShareableLink,
  ShareableShopCatalog,
  ShareLinkKind,
} from "./interfaces/monitor-links.interface";

const UUID_TEXT = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

function escapeForPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

const SHARE_LINK_URL_PATTERN = new RegExp(
  `^https?://[^/?#\\s]+(${escapeForPattern(WATCH_PATH_PREFIX)}|${escapeForPattern(SHARED_STORAGE_PATH_PREFIX)})/(${UUID_TEXT})/?\\?([^#\\s]*)`,
);

export function parseShareLinkUrl(text: string): ParsedShareLinkUrl | null {
  const match = SHARE_LINK_URL_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, pathPrefix, guid, query] = match;
  const tokenPair = query
    .split("&")
    .map((pair) => pair.split("="))
    .find(([name]) => name === SHARE_LINK_TOKEN_PARAM);
  const token = tokenPair?.[1] ? decodeURIComponent(tokenPair[1]) : null;
  if (!token) return null;
  return {
    kind: pathPrefix === WATCH_PATH_PREFIX ? "collection" : "storage",
    guid: guid.toLowerCase(),
    token,
  };
}

const SHORT_LINK_URL_PATTERN = new RegExp(
  `^https?://[^/?#\\s]+${escapeForPattern(SHORT_LINK_PATH_PREFIX)}/([0-9A-Za-z]{8,16})/?(?:[?#]\\S*)?$`,
);

export function shareLinkPathWithToken(path: string, token: string | null): string {
  return token ? `${path}?${new URLSearchParams({ [SHARE_LINK_TOKEN_PARAM]: token })}` : path;
}

const SHARE_LINK_PATH_PREFIX_BY_KIND: Record<ShareLinkKind, string> = {
  collection: WATCH_PATH_PREFIX,
  storage: SHARED_STORAGE_PATH_PREFIX,
  card: SHARED_CARD_PATH_PREFIX,
};

export function shareLinkPath(kind: ShareLinkKind, subjectGuid: string, token: string): string {
  const prefix = SHARE_LINK_PATH_PREFIX_BY_KIND[kind];
  return shareLinkPathWithToken(`${prefix}/${subjectGuid}`, token);
}

export function shopCatalogPath(catalogGuid: string, token: string | null): string {
  return shareLinkPathWithToken(`${SHOP_CATALOG_PATH_PREFIX}/${catalogGuid}`, token);
}

function withoutTrailingSlash(origin: string): string {
  return origin.replace(/\/$/, "");
}

export function buildShareLinkUrl(appOrigin: string, link: ShareableLink): string {
  return (
    link.shortUrl ??
    `${withoutTrailingSlash(appOrigin)}${shareLinkPath(link.kind, link.subjectGuid, link.token)}`
  );
}

export function buildShopCatalogLinkUrl(
  appOrigin: string,
  catalog: ShareableShopCatalog,
): string | null {
  if (!catalog.isPublic && !catalog.linkToken) return null;
  if (catalog.shortUrl) return catalog.shortUrl;
  const token = catalog.isPublic ? null : catalog.linkToken;
  return `${withoutTrailingSlash(appOrigin)}${shopCatalogPath(catalog.guid, token)}`;
}

export function buildShortenerUrl(shortLinkBaseUrl: string, shortCode: string): string {
  return `${shortLinkBaseUrl.replace(/\/$/, "")}/${shortCode}`;
}

function shortenerUrlPattern(shortLinkBaseUrl: string): RegExp {
  return new RegExp(
    `^${escapeForPattern(shortLinkBaseUrl.replace(/\/$/, ""))}/([0-9A-Za-z]{8,16})/?(?:[?#]\\S*)?$`,
    "i",
  );
}

export function parseShortLinkUrl(text: string, shortLinkBaseUrl?: string | null): string | null {
  const trimmed = text.trim();
  const appPathCode = SHORT_LINK_URL_PATTERN.exec(trimmed)?.[1];
  if (appPathCode) return appPathCode;
  if (!shortLinkBaseUrl) return null;
  return shortenerUrlPattern(shortLinkBaseUrl).exec(trimmed)?.[1] ?? null;
}
