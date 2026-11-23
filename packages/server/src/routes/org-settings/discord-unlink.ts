import { Hono } from "hono";
import { authQuery } from "../../db";
import { forgetDiscordGuildOrgs } from "../../lib/discord/guild-orgs";
import { clearOrgDiscordReferences } from "../../lib/discord/unlink";
import {
  rejectAccountChangesWhileImpersonating,
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";

export const discordUnlinkRoute = new Hono<AppEnv>().post(
  "/discord-unlink",
  requireAuth,
  rejectAccountChangesWhileImpersonating,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    const orgId = c.get("orgId");
    await authQuery(c.get("jwtClaims"), (tx) =>
      clearOrgDiscordReferences(tx, orgId),
    );
    forgetDiscordGuildOrgs();
    return c.json({ success: true, message: "Unlinked." });
  },
);
