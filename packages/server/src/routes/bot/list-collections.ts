import { Hono } from "hono";
import { loadBotCollectionList } from "../../lib/bot-collections";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

export const botListCollectionsRoute = new Hono<AppEnv>().get("/collections", async (c) => {
  const guildId = c.req.query("guildId");
  if (!guildId) {
    return c.json({ success: false, message: "guildId is required." }, 400);
  }
  const orgId = await resolveOrgByGuild(guildId);
  if (!orgId) {
    return c.json({ success: false, message: "not_linked" }, 404);
  }

  return c.json({ success: true, data: await loadBotCollectionList(orgId) });
});
