import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { collections, orgSettings } from "../../db/schema";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

export const botStatusRoute = new Hono<AppEnv>().get("/status", async (c) => {
  const guildId = c.req.query("guildId");
  const collectionGuid = c.req.query("collection");
  if (!guildId) {
    return c.json({ success: false, message: "guildId is required." }, 400);
  }
  const orgId = await resolveOrgByGuild(guildId);
  if (!orgId) {
    return c.json({ success: false, message: "not_linked" }, 404);
  }

  const [org] = await db
    .select({
      scanChannelId: orgSettings.discordScanChannelId,
      errorChannelId: orgSettings.discordErrorChannelId,
    })
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);

  if (collectionGuid) {
    const [collection] = await db
      .select({
        name: collections.name,
        scanChannelId: collections.discordScanChannelId,
        errorChannelId: collections.discordErrorChannelId,
      })
      .from(collections)
      .where(
        and(eq(collections.orgId, orgId), eq(collections.guid, collectionGuid)),
      )
      .limit(1);
    if (!collection) {
      return c.json({ success: false, message: "collection_not_found" }, 404);
    }
    return c.json({
      success: true,
      data: {
        orgScanChannelId: org?.scanChannelId ?? null,
        orgErrorChannelId: org?.errorChannelId ?? null,
        collection: {
          name: collection.name,
          scanChannelId: collection.scanChannelId,
          errorChannelId: collection.errorChannelId,
        },
        overrides: [],
      },
    });
  }

  const overrideRows = await db
    .select({
      name: collections.name,
      scanChannelId: collections.discordScanChannelId,
      errorChannelId: collections.discordErrorChannelId,
    })
    .from(collections)
    .where(
      and(
        eq(collections.orgId, orgId),
        sql`(${collections.discordScanChannelId} is not null or ${collections.discordErrorChannelId} is not null)`,
      ),
    )
    .orderBy(collections.name);

  return c.json({
    success: true,
    data: {
      orgScanChannelId: org?.scanChannelId ?? null,
      orgErrorChannelId: org?.errorChannelId ?? null,
      collection: null,
      overrides: overrideRows,
    },
  });
});
