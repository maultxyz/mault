import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgSettings } from "../../db/schema";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";
import { DISCORD_LINK_CODE_TTL_MS } from "./shared";

export const discordLinkCodeRoute = new Hono<AppEnv>().post(
  "/discord-link-code",
  requireAuth,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    const orgId = c.get("orgId");
    const code = crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 6)
      .toUpperCase();
    const expiresAt = new Date(Date.now() + DISCORD_LINK_CODE_TTL_MS);
    try {
      await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .insert(orgSettings)
          .values({
            orgId,
            discordLinkCode: code,
            discordLinkCodeExpiresAt: expiresAt,
          })
          .onConflictDoUpdate({
            target: [orgSettings.orgId],
            set: {
              discordLinkCode: code,
              discordLinkCodeExpiresAt: expiresAt,
              updatedAt: new Date(),
            },
          }),
      );
      return c.json({
        success: true,
        message: "Code generated.",
        data: { code, expiresAt },
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
