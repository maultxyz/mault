import {
  SHARED_STORAGE_PATH_PREFIX,
  SHARE_LINK_TOKEN_PARAM,
  SHORT_LINK_PATH_PREFIX,
  WATCH_PATH_PREFIX,
} from "./constants/monitor-links.constant";
import type { ParsedShareLinkUrl } from "./interfaces/monitor-links.interface";

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

export function buildShortLinkUrl(origin: string, shortCode: string): string {
  return `${origin.replace(/\/$/, "")}${SHORT_LINK_PATH_PREFIX}/${shortCode}`;
}

export function parseShortLinkUrl(text: string): string | null {
  return SHORT_LINK_URL_PATTERN.exec(text.trim())?.[1] ?? null;
}
