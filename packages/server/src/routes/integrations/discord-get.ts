import type { DiscordIntegration } from "@magic-vault/shared";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections, orgSettings } from "../../db/schema";
import { fetchDiscordGuild } from "../../lib/discord";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const getDiscordIntegrationRoute = new Hono<AppEnv>().get(
  "/discord",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const { settings, collectionRows } = await authQuery(
        c.get("jwtClaims"),
        async (tx) => {
          const [settings] = await tx
            .select({
              guildId: orgSettings.discordGuildId,
              notifyOnScan: orgSettings.discordNotifyOnScan,
              scanChannelId: orgSettings.discordScanChannelId,
              errorChannelId: orgSettings.discordErrorChannelId,
            })
            .from(orgSettings)
            .where(eq(orgSettings.orgId, orgId))
            .limit(1);
          const collectionRows = await tx
            .select({
              guid: collections.guid,
              name: collections.name,
              scanChannelId: collections.discordScanChannelId,
              errorChannelId: collections.discordErrorChannelId,
            })
            .from(collections)
            .where(
              and(
                eq(collections.orgId, orgId),
                or(
                  isNotNull(collections.discordScanChannelId),
                  isNotNull(collections.discordErrorChannelId),
                ),
              ),
            );
          return { settings, collectionRows };
        },
      );

      const guildId = settings?.guildId ?? null;
      const { reachable, guild } = guildId
        ? await fetchDiscordGuild(guildId)
        : { reachable: true, guild: null };

      const data: DiscordIntegration = {
        linked: !!guildId,
        botReachable: reachable,
        guild,
        notifyOnScan: settings?.notifyOnScan ?? false,
        scanChannelId: settings?.scanChannelId ?? null,
        errorChannelId: settings?.errorChannelId ?? null,
        collections: collectionRows.map((row) => ({
          guid: row.guid!,
          name: row.name,
          scanChannelId: row.scanChannelId,
          errorChannelId: row.errorChannelId,
        })),
      };
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
