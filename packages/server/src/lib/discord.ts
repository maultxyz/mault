import {
  isRuleGroup,
  type BinCondition,
  type BinRuleGroup,
  type PlayingCard,
} from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { bins, binSets, collections, orgSettings } from "../db/schema";

export type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  timestamp: string;
  url?: string;
  image?: { url: string };
  footer?: { text: string };
};

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
  const base = process.env.WEB_URL ?? "http://localhost:5173";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export interface CardScannedEmbedOptions {
  isFoil?: boolean;
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
  if (isFoil) lines.push("**Foil**");
  if (collectionName) lines.push(`**Collection:** ${collectionName}`);
  if (gameName) lines.push(`**Game:** ${gameName}`);

  const monitorUrl = collectionGuid
    ? `${process.env.WEB_URL ?? "http://localhost:5173"}/app/monitor/${collectionGuid}`
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

const OPERATOR_TEXT: Record<string, string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  not_contains: "does not contain",
  starts_with: "starts with",
  ends_with: "ends with",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "is one of",
  not_in: "is not one of",
  contains_any: "contains any of",
  contains_all: "contains all of",
  contains_none: "contains none of",
};

function describeCondition(cond: BinCondition): string {
  const value = Array.isArray(cond.value)
    ? cond.value.join(", ")
    : String(cond.value);
  return `${cond.field} ${OPERATOR_TEXT[cond.operator] ?? cond.operator} ${value}`;
}

function describeRuleGroup(group: BinRuleGroup): string {
  if (!group.conditions || group.conditions.length === 0) return "always";
  const parts = group.conditions.map((c) =>
    isRuleGroup(c) ? `(${describeRuleGroup(c)})` : describeCondition(c),
  );
  return parts.join(group.combinator === "and" ? " AND " : " OR ");
}

export async function buildSortingLogicSummary(
  orgId: string,
  gameId: number | null,
): Promise<string> {
  const setRows = await db
    .select({ id: binSets.id, name: binSets.name })
    .from(binSets)
    .where(
      gameId != null
        ? and(
            eq(binSets.orgId, orgId),
            eq(binSets.isActive, true),
            eq(binSets.gameId, gameId),
          )
        : and(eq(binSets.orgId, orgId), eq(binSets.isActive, true)),
    )
    .limit(1);
  const set = setRows[0];
  if (!set) return "No active sorting rules configured.";

  const binRows = await db
    .select({
      binNumber: bins.binNumber,
      rules: bins.rules,
      isCatchAll: bins.isCatchAll,
    })
    .from(bins)
    .where(eq(bins.binSet, set.id))
    .orderBy(bins.binNumber);

  if (binRows.length === 0)
    return `**Sorting logic:** ${set.name} (no bins configured)`;

  const lines = binRows.map((b) =>
    b.isCatchAll
      ? `**Bin ${b.binNumber}:** everything else`
      : `**Bin ${b.binNumber}:** ${describeRuleGroup(b.rules as BinRuleGroup)}`,
  );

  return `**Sorting logic:** ${set.name}\n${lines.join("\n")}`;
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

export type DiscordNotificationKind = "scan" | "error";

const THREAD_NAMES: Record<DiscordNotificationKind, string> = {
  scan: "Card Scans",
  error: "Notifications",
};

interface NotifyConfig {
  channelId: string | null;
  threadId: string | null;
  source: "collection" | "org";
}

async function getNotifyConfig(
  orgId: string,
  kind: DiscordNotificationKind,
  collectionGuid?: string,
): Promise<NotifyConfig> {
  if (collectionGuid) {
    const collectionRows = await db
      .select({
        discordScanChannelId: collections.discordScanChannelId,
        discordScanThreadId: collections.discordScanThreadId,
        discordErrorChannelId: collections.discordErrorChannelId,
        discordErrorThreadId: collections.discordErrorThreadId,
      })
      .from(collections)
      .where(
        and(eq(collections.guid, collectionGuid), eq(collections.orgId, orgId)),
      )
      .limit(1);
    const collectionRow = collectionRows[0];
    const channelId =
      kind === "scan"
        ? collectionRow?.discordScanChannelId
        : collectionRow?.discordErrorChannelId;
    if (channelId) {
      return {
        channelId,
        threadId:
          (kind === "scan"
            ? collectionRow?.discordScanThreadId
            : collectionRow?.discordErrorThreadId) ?? null,
        source: "collection",
      };
    }
  }

  const rows = await db
    .select({
      discordScanChannelId: orgSettings.discordScanChannelId,
      discordScanThreadId: orgSettings.discordScanThreadId,
      discordErrorChannelId: orgSettings.discordErrorChannelId,
      discordErrorThreadId: orgSettings.discordErrorThreadId,
    })
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);
  const row = rows[0];
  return {
    channelId:
      (kind === "scan"
        ? row?.discordScanChannelId
        : row?.discordErrorChannelId) ?? null,
    threadId:
      (kind === "scan" ? row?.discordScanThreadId : row?.discordErrorThreadId) ??
      null,
    source: "org",
  };
}

async function postEmbedToBot(
  channelId: string,
  threadId: string | null,
  threadName: string | null,
  embed: DiscordEmbed,
  attachmentDataUrl?: string,
  secondaryImageUrl?: string,
  useThread = true,
): Promise<string | null> {
  const botUrl = process.env.BOT_URL;
  const botSecret = process.env.BOT_API_SECRET;
  if (!botUrl || !botSecret) return null;

  try {
    const res = await fetch(`${botUrl}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": botSecret,
      },
      body: JSON.stringify({
        channelId,
        threadId,
        threadName,
        useThread,
        embed,
        attachmentDataUrl,
        secondaryImageUrl,
      }),
    });
    if (!res.ok) {
      console.error(`[discord] Bot notify POST failed: ${res.status}`);
      return null;
    }

    const result = (await res.json()) as {
      success: boolean;
      data?: { threadId?: string };
    };
    return result.data?.threadId ?? null;
  } catch (err) {
    console.error("[discord] Failed to send bot notification:", err);
    return null;
  }
}

export async function sendDiscordNotification(
  orgId: string,
  embed: DiscordEmbed,
  kind: DiscordNotificationKind,
  attachmentDataUrl?: string,
  secondaryImageUrl?: string,
  collectionGuid?: string,
): Promise<void> {
  const config = await getNotifyConfig(orgId, kind, collectionGuid);
  if (!config.channelId) return;

  const newThreadId = await postEmbedToBot(
    config.channelId,
    config.threadId,
    THREAD_NAMES[kind],
    embed,
    attachmentDataUrl,
    secondaryImageUrl,
  );
  if (newThreadId && newThreadId !== config.threadId) {
    if (config.source === "collection" && collectionGuid) {
      await db
        .update(collections)
        .set(
          kind === "scan"
            ? { discordScanThreadId: newThreadId, updatedAt: new Date() }
            : { discordErrorThreadId: newThreadId, updatedAt: new Date() },
        )
        .where(
          and(eq(collections.guid, collectionGuid), eq(collections.orgId, orgId)),
        );
    } else {
      await db
        .update(orgSettings)
        .set(
          kind === "scan"
            ? { discordScanThreadId: newThreadId, updatedAt: new Date() }
            : { discordErrorThreadId: newThreadId, updatedAt: new Date() },
        )
        .where(eq(orgSettings.orgId, orgId));
    }
  }
}

export async function sendDonationDiscordNotification(
  embed: DiscordEmbed,
): Promise<void> {
  const channelId = process.env.DISCORD_DONATION_CHANNEL_ID;
  if (!channelId) return;

  await postEmbedToBot(
    channelId,
    null,
    null,
    embed,
    undefined,
    undefined,
    false,
  );
}
