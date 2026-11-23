import {
  MARKETING_OPEN_GRAPH_PAGES,
  OPEN_GRAPH_IMAGE_FILE_EXTENSION,
  OPEN_GRAPH_IMAGE_PAGES_SEGMENT,
  OPEN_GRAPH_DEFAULT_THEME,
  OPEN_GRAPH_IMAGE_ROUTE_PATH,
  OPEN_GRAPH_IMAGE_THEME_PARAM,
  OPEN_GRAPH_IMAGE_VERSION_PARAM,
  OPEN_GRAPH_SORTER_PHOTO_ALT,
  OPEN_GRAPH_THEMES,
} from "./constants/open-graph.constant";
import type {
  MarketingOpenGraphPageKey,
  OpenGraphTheme,
} from "./interfaces/open-graph.interface";

function contentVersionOf(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function isMarketingOpenGraphPageKey(value: string): value is MarketingOpenGraphPageKey {
  return Object.prototype.hasOwnProperty.call(MARKETING_OPEN_GRAPH_PAGES, value);
}

export function isOpenGraphTheme(value: string | null | undefined): value is OpenGraphTheme {
  return (OPEN_GRAPH_THEMES as readonly (string | null | undefined)[]).includes(value);
}

export function openGraphThemeOf(value: string | null | undefined): OpenGraphTheme {
  return isOpenGraphTheme(value) ? value : OPEN_GRAPH_DEFAULT_THEME;
}

export function marketingOpenGraphImagePath(
  pageKey: MarketingOpenGraphPageKey,
  theme: OpenGraphTheme = OPEN_GRAPH_DEFAULT_THEME,
): string {
  const version = contentVersionOf(JSON.stringify([MARKETING_OPEN_GRAPH_PAGES[pageKey], theme]));
  return `${OPEN_GRAPH_IMAGE_ROUTE_PATH}/${OPEN_GRAPH_IMAGE_PAGES_SEGMENT}/${pageKey}${OPEN_GRAPH_IMAGE_FILE_EXTENSION}?${OPEN_GRAPH_IMAGE_THEME_PARAM}=${theme}&${OPEN_GRAPH_IMAGE_VERSION_PARAM}=${version}`;
}

function asSentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

export function marketingOpenGraphImageAlt(pageKey: MarketingOpenGraphPageKey): string {
  const page = MARKETING_OPEN_GRAPH_PAGES[pageKey];
  return [
    `Mault ${page.eyebrow.toLowerCase()}: ${asSentence(page.headline)}`,
    asSentence(page.subtitle),
    asSentence(page.stats.map((stat) => stat.text).join(", ")),
    asSentence(OPEN_GRAPH_SORTER_PHOTO_ALT),
  ].join(" ");
}
