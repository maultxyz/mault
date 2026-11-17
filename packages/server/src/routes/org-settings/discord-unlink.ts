import { Hono } from "hono";
import { authQuery } from "../../db";
import { clearOrgDiscordReferences } from "../../lib/discord/unlink";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";

export const discordUnlinkRoute = new Hono<AppEnv>().post(
  "/discord-unlink",
  requireAuth,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    const orgId = c.get("orgId");
    await authQuery(c.get("jwtClaims"), (tx) =>
      clearOrgDiscordReferences(tx, orgId),
    );
    return c.json({ success: true, message: "Unlinked." });
  },
);
