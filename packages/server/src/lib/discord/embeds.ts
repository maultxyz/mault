import type { PlayingCard } from "@magic-vault/shared";
import { getWebUrl } from "../constants/urls";
import type { DiscordEmbed } from "./types";

const CARD_SCANNED_COLOR = 0x5865f2; // Discord blurple
export const SCAN_ATTACHMENT_NAME = "scan.jpg";

function resolveImageUrl(url: string): string {
  const proxied = url.match(/\/cards\/image-proxy\?url=([^&]+)/);
  if (proxied) {
    try {
      return decodeURIComponent(proxied[1]);
    } catch {
      // malformed encoding - fall through to the raw url below
    }
  }
  if (/^https?:\/\//i.test(url)) return url;
  const base = getWebUrl();
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export interface CardScannedEmbedOptions {
  isFoil?: boolean;
  foilType?: string;
  collectionName?: string;
  gameName?: string;
  collectionGuid?: string;
  capturedImageDataUrl?: string;
}

export interface CardScannedEmbedResult {
  embed: DiscordEmbed;
  referenceImageUrl?: string;
}

export function buildCardScannedEmbed(
  card: PlayingCard,
  options: CardScannedEmbedOptions = {},
): CardScannedEmbedResult {
  const {
    isFoil,
    foilType,
    collectionName,
    gameName,
    collectionGuid,
    capturedImageDataUrl,
  } = options;

  const lines = [];
  if (card.price != null) {
    lines.push(`**Price:** $${card.price.toFixed(2)} USD`);
  }
  if (card.priceFoil != null) {
    lines.push(`**Foil Price:** $${card.priceFoil.toFixed(2)} USD`);
  }
  if (lines.length === 0) lines.push("**Price:** N/A");
  if (isFoil) lines.push(`**${foilType ?? "Foil"}**`);
  if (collectionName) lines.push(`**Collection:** ${collectionName}`);
  if (gameName) lines.push(`**Game:** ${gameName}`);

  const monitorUrl = collectionGuid
    ? `${getWebUrl()}/app/monitor/${collectionGuid}`
    : undefined;

  const referenceImageUrl = card.image?.normal
    ? resolveImageUrl(card.image.normal)
    : undefined;

  const image = capturedImageDataUrl
    ? { url: `attachment://${SCAN_ATTACHMENT_NAME}` }
    : referenceImageUrl
      ? { url: referenceImageUrl }
      : undefined;

  const embed: DiscordEmbed = {
    title: card.name,
    description: lines.join("\n"),
    color: CARD_SCANNED_COLOR,
    timestamp: new Date().toISOString(),
    ...(monitorUrl ? { url: monitorUrl } : {}),
    ...(image ? { image } : {}),
  };

  return {
    embed,
    referenceImageUrl: capturedImageDataUrl ? referenceImageUrl : undefined,
  };
}

export function buildScanSessionStartEmbed(
  collectionName: string,
  sortingLogicSummary: string,
): DiscordEmbed {
  return {
    title: `New scan session — ${collectionName}`,
    description: sortingLogicSummary,
    color: CARD_SCANNED_COLOR,
    timestamp: new Date().toISOString(),
  };
}
