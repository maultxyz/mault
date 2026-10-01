import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { collections, orgSettings } from "../../db/schema";
import type {
  BotPostRequest,
  DiscordEmbed,
  DiscordNotificationKind,
  DiscordNotifyOutcome,
} from "./types";

const SCAN_THREAD_NAME = "Card Scans";

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
  request: BotPostRequest,
): Promise<{ ok: boolean; threadId: string | null }> {
  const botUrl = process.env.BOT_URL;
  const botSecret = process.env.BOT_API_SECRET;
  if (!botUrl || !botSecret) return { ok: false, threadId: null };

  try {
    const res = await fetch(`${botUrl}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": botSecret,
      },
      body: JSON.stringify({
        ...request,
        useThread: !!request.threadName,
      }),
    });
    if (!res.ok) {
      console.error(`[discord] Bot notify POST failed: ${res.status}`);
      return { ok: false, threadId: null };
    }

    const result = (await res.json()) as {
      success: boolean;
      data?: { threadId?: string };
    };
    return { ok: result.success, threadId: result.data?.threadId ?? null };
  } catch (err) {
    console.error("[discord] Failed to send bot notification:", err);
    return { ok: false, threadId: null };
  }
}

async function scanThreadsEnabled(orgId: string): Promise<boolean> {
  const [row] = await db
    .select({ useThreads: orgSettings.discordScanUseThreads })
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);
  return row?.useThreads ?? true;
}

export async function sendDiscordNotification(
  orgId: string,
  embed: DiscordEmbed,
  kind: DiscordNotificationKind,
  attachmentDataUrl?: string,
  secondaryImageUrl?: string,
  collectionGuid?: string,
): Promise<DiscordNotifyOutcome> {
  const config = await getNotifyConfig(orgId, kind, collectionGuid);
  if (!config.channelId) return "no_channel";

  if (kind === "error" || !(await scanThreadsEnabled(orgId))) {
    const { ok } = await postEmbedToBot({
      channelId: config.channelId,
      embed,
      attachmentDataUrl,
      secondaryImageUrl,
    });
    return ok ? "sent" : "failed";
  }

  const { ok, threadId: newThreadId } = await postEmbedToBot({
    channelId: config.channelId,
    threadId: config.threadId,
    threadName: SCAN_THREAD_NAME,
    embed,
    attachmentDataUrl,
    secondaryImageUrl,
  });
  if (newThreadId && newThreadId !== config.threadId) {
    const update = { discordScanThreadId: newThreadId, updatedAt: new Date() };
    if (config.source === "collection" && collectionGuid) {
      await db
        .update(collections)
        .set(update)
        .where(
          and(eq(collections.guid, collectionGuid), eq(collections.orgId, orgId)),
        );
    } else {
      await db
        .update(orgSettings)
        .set(update)
        .where(eq(orgSettings.orgId, orgId));
    }
  }
  return ok ? "sent" : "failed";
}

export async function sendDonationDiscordNotification(
  embed: DiscordEmbed,
): Promise<void> {
  const channelId = process.env.DISCORD_DONATION_CHANNEL_ID;
  if (!channelId) return;

  await postEmbedToBot({ channelId, embed });
}

export async function sendDiscordChannelMessage(
  request: Required<Pick<BotPostRequest, "guildId">> & BotPostRequest,
): Promise<boolean> {
  const { ok } = await postEmbedToBot(request);
  return ok;
}
