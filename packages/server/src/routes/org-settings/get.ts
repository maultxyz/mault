import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgSettings } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const getOrgSettingsRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const row = await tx.query.orgSettings.findFirst({
          where: eq(orgSettings.orgId, orgId),
        });

        return {
          success: true,
          message: "Loaded.",
          data: {
            primaryColor: row?.primaryColor ?? null,
            scannerLayout:
              (row?.scannerLayout as "horizontal" | "vertical") ?? "horizontal",
            discordNotifyOnScan: row?.discordNotifyOnScan ?? false,
            sessionWrappedEnabled: row?.sessionWrappedEnabled ?? true,
            discordGuildId: row?.discordGuildId ?? null,
          },
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
