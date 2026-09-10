import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgSettings } from "../../db/schema";
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
    try {
      await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .update(orgSettings)
          .set({ discordGuildId: null, updatedAt: new Date() })
          .where(eq(orgSettings.orgId, orgId)),
      );
      return c.json({ success: true, message: "Unlinked." });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
