import { Hono } from "hono";
import { db } from "../../db";
import { clearOrgDiscordReferences } from "../../lib/discord/unlink";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

export const botUnlinkRoute = new Hono<AppEnv>().post("/unlink", async (c) => {
  const { guildId } = await c.req.json<{ guildId?: string }>();
  if (!guildId) {
    return c.json({ success: false, message: "guildId is required." }, 400);
  }

  const orgId = await resolveOrgByGuild(guildId);
  if (!orgId) return c.json({ success: true, message: "Not linked." });

  await db.transaction((tx) => clearOrgDiscordReferences(tx, orgId));
  return c.json({ success: true, message: "Unlinked." });
});
