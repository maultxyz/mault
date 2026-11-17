import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections, orgSettings } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { DISCORD_CHANNEL_EDITOR_ROLES } from "../../lib/constants/discord";
import {
  channelInputSchema,
  channelUpdate,
  checkDiscordTargets,
} from "./shared";

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
    const { scanChannelId, errorChannelId, scanRoleId, errorRoleId, collectionGuid } =
      input.data;
    const targetError = await checkDiscordTargets(
      orgId,
      [...new Set([scanChannelId, errorChannelId])].filter(
        (channelId): channelId is string => !!channelId,
      ),
      [...new Set([scanRoleId, errorRoleId])].filter(
        (roleId): roleId is string => !!roleId,
      ),
    );
    if (targetError) {
      return c.json({ success: false, message: targetError });
    }

    const update = channelUpdate(input.data, new Date());
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      if (collectionGuid) {
        const [updated] = await tx
          .update(collections)
          .set(update)
          .where(
            and(
              eq(collections.guid, collectionGuid),
              eq(collections.orgId, orgId),
              eq(collections.isDeleted, false),
            ),
          )
          .returning({ id: collections.id });
        return updated
          ? { success: true as const }
          : { success: false as const, message: "Collection not found." };
      }

      await tx
        .update(orgSettings)
        .set(update)
        .where(eq(orgSettings.orgId, orgId));
      return { success: true as const };
    });
    return c.json(result);
  },
);
