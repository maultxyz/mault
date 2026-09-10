import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { collections, orgSettings } from "../../db/schema";
import type { DiscordEmbed, DiscordNotificationKind } from "./types";

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
