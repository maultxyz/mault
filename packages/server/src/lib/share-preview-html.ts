import {
  SHARED_CARD_PATH_PREFIX,
  SHARED_STORAGE_PATH_PREFIX,
  SHARE_LINK_TOKEN_PARAM,
  SHOP_CATALOG_PATH_PREFIX,
  WATCH_PATH_PREFIX,
  type PublicCardGame,
} from "@magic-vault/shared";
import {
  SHARE_PREVIEW_DEFAULT_IMAGE_ALT,
  SHARE_PREVIEW_DEFAULT_IMAGE_HEIGHT,
  SHARE_PREVIEW_DEFAULT_IMAGE_PATH,
  SHARE_PREVIEW_DEFAULT_IMAGE_WIDTH,
  SHARE_PREVIEW_DESCRIPTION_MAX_LENGTH,
  SHARE_PREVIEW_DESCRIPTION_SEPARATOR,
  SHARE_PREVIEW_GAMES_LISTED_MAX,
  SHARE_PREVIEW_INDEXABLE_ROBOTS,
  SHARE_PREVIEW_LOCALE,
  SHARE_PREVIEW_PRIVATE_ROBOTS,
  SHARE_PREVIEW_SITE_NAME,
  SHARE_PREVIEW_UNAVAILABLE_DESCRIPTION,
  SHARE_PREVIEW_UNAVAILABLE_TITLE,
} from "./constants/share-preview";
import type {
  SharePreview,
  SharePreviewCardSummary,
  SharePreviewLinkKind,
  SharePreviewListSummary,
  SharePreviewRequest,
} from "./interfaces/share-preview";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SHARE_PREVIEW_KIND_BY_PATH_PREFIX: [string, SharePreviewLinkKind][] = [
  [WATCH_PATH_PREFIX, "collection"],
  [SHARED_STORAGE_PATH_PREFIX, "storage"],
  [SHARED_CARD_PATH_PREFIX, "card"],
  [SHOP_CATALOG_PATH_PREFIX, "shopCatalog"],
];

export function parseSharePreviewPath(pathWithQuery: string): SharePreviewRequest | null {
  let url: URL;
  try {
    url = new URL(pathWithQuery, "http://share-preview.invalid");
  } catch {
    return null;
  }
  const pathname = url.pathname.replace(/\/+$/, "");
  for (const [prefix, kind] of SHARE_PREVIEW_KIND_BY_PATH_PREFIX) {
    if (!pathname.startsWith(`${prefix}/`)) continue;
    const subjectGuid = pathname.slice(prefix.length + 1);
    if (!UUID_PATTERN.test(subjectGuid)) return null;
    return {
      kind,
      subjectGuid: subjectGuid.toLowerCase(),
      token: url.searchParams.get(SHARE_LINK_TOKEN_PARAM) || null,
      pathWithQuery: `${url.pathname}${url.search}`,
    };
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

function cardCountText(count: number): string {
  return count === 1 ? "1 card" : `${formatCount(count)} cards`;
}

function gamesText(games: PublicCardGame[]): string | null {
  if (games.length === 0) return null;
  const listed = games.slice(0, SHARE_PREVIEW_GAMES_LISTED_MAX).map((game) => game.name);
  const hiddenCount = games.length - listed.length;
  return hiddenCount > 0 ? `${listed.join(", ")} and ${hiddenCount} more` : listed.join(", ");
}

function withGames(sentence: string, games: PublicCardGame[]): string {
  const listedGames = gamesText(games);
  return listedGames ? `${sentence}: ${listedGames}.` : `${sentence}.`;
}

function absoluteUrl(webUrl: string, urlOrPath: string): string {
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  const origin = webUrl.replace(/\/+$/, "");
  return `${origin}${urlOrPath.startsWith("/") ? "" : "/"}${urlOrPath}`;
}

export function unavailableSharePreview(pathWithQuery: string): SharePreview {
  return {
    title: SHARE_PREVIEW_UNAVAILABLE_TITLE,
    description: SHARE_PREVIEW_UNAVAILABLE_DESCRIPTION,
    pathWithQuery,
    isIndexable: false,
    image: null,
  };
}

export function collectionSharePreviewText(summary: SharePreviewListSummary): {
  title: string;
  description: string;
} {
  const count = cardCountText(summary.cardCount);
  return summary.isTradeLink
    ? {
        title: `Trade for cards from ${summary.subjectName}`,
        description: withGames(
          `Browse ${count} from the ${summary.subjectName} collection and send a trade offer`,
          summary.games,
        ),
      }
    : {
        title: summary.subjectName,
        description: withGames(
          `Browse ${count} from the ${summary.subjectName} collection`,
          summary.games,
        ),
      };
}

export function storageSharePreviewText(summary: SharePreviewListSummary): {
  title: string;
  description: string;
} {
  const count = cardCountText(summary.cardCount);
  return summary.isTradeLink
    ? {
        title: `Trade for cards from ${summary.subjectName}`,
        description: withGames(
          `Browse ${count} stored in ${summary.subjectName} and send a trade offer`,
          summary.games,
        ),
      }
    : {
        title: summary.subjectName,
        description: withGames(`Browse ${count} stored in ${summary.subjectName}`, summary.games),
      };
}

export function shopCatalogSharePreviewText(summary: SharePreviewListSummary): {
  title: string;
  description: string;
} {
  return {
    title: summary.subjectName,
    description: withGames(
      `Shop ${cardCountText(summary.cardCount)} for sale from ${summary.subjectName}`,
      summary.games,
    ),
  };
}

export function cardSharePreviewText(card: SharePreviewCardSummary): {
  title: string;
  description: string;
} {
  const printing = [card.setName, card.collectorNumber ? `#${card.collectorNumber}` : null]
    .filter(Boolean)
    .join(" ");
  const finish = card.isFoil ? (card.foilType ?? "Foil") : null;
  const details = [printing || null, card.condition, finish, card.formattedPrice].filter(
    (part): part is string => Boolean(part),
  );
  return {
    title: card.name,
    description:
      details.length > 0
        ? `${card.name}${SHARE_PREVIEW_DESCRIPTION_SEPARATOR}${details.join(SHARE_PREVIEW_DESCRIPTION_SEPARATOR)}`
        : `${card.name}, shared on ${SHARE_PREVIEW_SITE_NAME}.`,
  };
}

function metaTag(attribute: "name" | "property", key: string, content: string): string {
  return `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
}

export function renderSharePreviewHtml(preview: SharePreview, webUrl: string): string {
  const title = `${preview.title} | ${SHARE_PREVIEW_SITE_NAME}`;
  const description = truncate(preview.description, SHARE_PREVIEW_DESCRIPTION_MAX_LENGTH);
  const url = absoluteUrl(webUrl, preview.pathWithQuery);
  const image = preview.image ?? {
    url: SHARE_PREVIEW_DEFAULT_IMAGE_PATH,
    alt: SHARE_PREVIEW_DEFAULT_IMAGE_ALT,
    width: SHARE_PREVIEW_DEFAULT_IMAGE_WIDTH,
    height: SHARE_PREVIEW_DEFAULT_IMAGE_HEIGHT,
  };
  const imageUrl = absoluteUrl(webUrl, image.url);
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    metaTag("name", "description", description),
    metaTag(
      "name",
      "robots",
      preview.isIndexable ? SHARE_PREVIEW_INDEXABLE_ROBOTS : SHARE_PREVIEW_PRIVATE_ROBOTS,
    ),
    ...(preview.isIndexable ? [`<link rel="canonical" href="${escapeHtml(url)}" />`] : []),
    metaTag("property", "og:type", "website"),
    metaTag("property", "og:site_name", SHARE_PREVIEW_SITE_NAME),
    metaTag("property", "og:locale", SHARE_PREVIEW_LOCALE),
    metaTag("property", "og:url", url),
    metaTag("property", "og:title", title),
    metaTag("property", "og:description", description),
    metaTag("property", "og:image", imageUrl),
    ...(image.width && image.height
      ? [
          metaTag("property", "og:image:width", String(image.width)),
          metaTag("property", "og:image:height", String(image.height)),
        ]
      : []),
    metaTag("property", "og:image:alt", image.alt),
    metaTag("name", "twitter:card", "summary_large_image"),
    metaTag("name", "twitter:title", title),
    metaTag("name", "twitter:description", description),
    metaTag("name", "twitter:image", imageUrl),
    metaTag("name", "twitter:image:alt", image.alt),
  ];
  return `${tags.join("\n    ")}\n`;
}
