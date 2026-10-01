import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections, orgSettings } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { DISCORD_CHANNEL_EDITOR_ROLES } from "../../lib/constants/discord";
import { channelInputSchema, checkDiscordChannel } from "./shared";

export const setDiscordChannelRoute = new Hono<AppEnv>().put(
  "/discord/channels",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    if (!DISCORD_CHANNEL_EDITOR_ROLES.includes(c.get("orgRole"))) {
      return c.json({
        success: false,
        message: "Only organization owners and admins can change channels.",
      });
    }
    const input = channelInputSchema.safeParse(await c.req.json());
    if (!input.success) {
      return c.json({ success: false, message: "Invalid channel." }, 400);
    }
    const { kind, channelId, collectionGuid } = input.data;
    try {
      if (channelId) {
        const channelError = await checkDiscordChannel(orgId, channelId);
        if (channelError) {
          return c.json({ success: false, message: channelError });
        }
      }

      const updatedAt = new Date();
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        if (collectionGuid) {
          const [updated] = await tx
            .update(collections)
            .set(
              kind === "scan"
                ? {
                    discordScanChannelId: channelId,
                    discordScanThreadId: null,
                    updatedAt,
                  }
                : {
                    discordErrorChannelId: channelId,
                    discordErrorThreadId: null,
                    updatedAt,
                  },
            )
            .where(
              and(
                eq(collections.guid, collectionGuid),
                eq(collections.orgId, orgId),
              ),
            )
            .returning({ id: collections.id });
          return updated
            ? { success: true as const }
            : { success: false as const, message: "Collection not found." };
        }

        await tx
          .update(orgSettings)
          .set(
            kind === "scan"
              ? {
                  discordScanChannelId: channelId,
                  discordScanThreadId: null,
                  updatedAt,
                }
              : {
                  discordErrorChannelId: channelId,
                  discordErrorThreadId: null,
                  updatedAt,
                },
          )
          .where(eq(orgSettings.orgId, orgId));
        return { success: true as const };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
