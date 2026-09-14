import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgSettings } from "../../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const editOrgSettingsRoute = new Hono<AppEnv>().put(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const body = await c.req.json<{
      primaryColor?: string | null;
      scannerLayout?: string | null;
      discordNotifyOnScan?: boolean;
      sessionWrappedEnabled?: boolean;
    }>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const existing = await tx.query.orgSettings.findFirst({
          where: eq(orgSettings.orgId, orgId),
        });

        const merged = {
          primaryColor:
            "primaryColor" in body
              ? (body.primaryColor ?? null)
              : (existing?.primaryColor ?? null),
          scannerLayout:
            "scannerLayout" in body
              ? (body.scannerLayout ?? null)
              : (existing?.scannerLayout ?? null),
          discordNotifyOnScan:
            "discordNotifyOnScan" in body
              ? (body.discordNotifyOnScan ?? false)
              : (existing?.discordNotifyOnScan ?? false),
          sessionWrappedEnabled:
            "sessionWrappedEnabled" in body
              ? (body.sessionWrappedEnabled ?? true)
              : (existing?.sessionWrappedEnabled ?? true),
        };
        await tx
          .insert(orgSettings)
          .values({ orgId, ...merged })
          .onConflictDoUpdate({
            target: [orgSettings.orgId],
            set: { ...merged, updatedAt: new Date() },
          });

        return {
          success: true,
          message: "Saved.",
          data: {
            primaryColor: merged.primaryColor,
            scannerLayout:
              (merged.scannerLayout as "horizontal" | "vertical") ??
              "horizontal",
            discordNotifyOnScan: merged.discordNotifyOnScan,
            sessionWrappedEnabled: merged.sessionWrappedEnabled,
            discordGuildId: existing?.discordGuildId ?? null,
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
