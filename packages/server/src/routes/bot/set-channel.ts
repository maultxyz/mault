import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { collections, orgSettings } from "../../db/schema";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

export const botSetChannelRoute = new Hono<AppEnv>().post("/set-channel", async (c) => {
  const body = await c.req.json<{
    guildId?: string;
    channelId?: string;
    kind?: string;
    collectionGuid?: string;
    clear?: boolean;
  }>();
  const { guildId, channelId, kind, collectionGuid, clear } = body;
  if (
    !guildId ||
    (kind !== "scan" && kind !== "error") ||
    (!channelId && !clear)
  ) {
    return c.json(
      {
        success: false,
        message:
          'guildId, kind ("scan" or "error"), and either channelId or clear are required.',
      },
      400,
    );
  }

  const orgId = await resolveOrgByGuild(guildId);
  if (!orgId) {
    return c.json({ success: false, message: "not_linked" }, 404);
  }

  const nextChannelId = clear ? null : channelId!;

  if (collectionGuid) {
    const result = await db
      .update(collections)
      .set(
        kind === "scan"
          ? {
              discordScanChannelId: nextChannelId,
              discordScanThreadId: null,
              updatedAt: new Date(),
            }
          : {
              discordErrorChannelId: nextChannelId,
              discordErrorThreadId: null,
              updatedAt: new Date(),
            },
      )
      .where(
        and(eq(collections.guid, collectionGuid), eq(collections.orgId, orgId)),
      )
      .returning({ id: collections.id });
    if (result.length === 0) {
      return c.json({ success: false, message: "collection_not_found" }, 404);
    }
    return c.json({ success: true, message: "Channel set." });
  }

  await db
    .update(orgSettings)
    .set(
      kind === "scan"
        ? {
            discordScanChannelId: nextChannelId,
            discordScanThreadId: null,
            updatedAt: new Date(),
          }
        : {
            discordErrorChannelId: nextChannelId,
            discordErrorThreadId: null,
            updatedAt: new Date(),
          },
    )
    .where(eq(orgSettings.orgId, orgId));

  return c.json({ success: true, message: "Channel set." });
});
