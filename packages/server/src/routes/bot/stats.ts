import { Hono } from "hono";
import { loadBotCollectionStats } from "../../lib/bot-stats";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild, resolveOrgCollection } from "./shared";

export const botStatsRoute = new Hono<AppEnv>().get("/stats", async (c) => {
  const guildId = c.req.query("guildId");
  const collectionGuid = c.req.query("collection");
  if (!guildId) {
    return c.json({ success: false, message: "guildId is required." }, 400);
  }
  const orgId = await resolveOrgByGuild(guildId);
  if (!orgId) {
    return c.json({ success: false, message: "not_linked" }, 404);
  }

  const collection = collectionGuid
    ? await resolveOrgCollection(orgId, collectionGuid)
    : null;
  if (collectionGuid && !collection) {
    return c.json({ success: false, message: "collection_not_found" }, 404);
  }

  return c.json({
    success: true,
    data: await loadBotCollectionStats(orgId, collection),
  });
});
