import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_MODULE_COUNT,
  maxModulesForLayout,
  type ChannelLayout,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgSettings } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { detectDefaultChannelLayout, toScanRegion } from "./shared";

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

        let channelLayout = row?.channelLayout as
          | ChannelLayout
          | null
          | undefined;
        if (!channelLayout) {
          channelLayout = await detectDefaultChannelLayout(tx, orgId);
          await tx
            .insert(orgSettings)
            .values({ orgId, channelLayout })
            .onConflictDoUpdate({
              target: [orgSettings.orgId],
              set: { channelLayout, updatedAt: new Date() },
            });
        }

        const moduleCount = Math.min(
          row?.moduleCount ?? DEFAULT_MODULE_COUNT,
          maxModulesForLayout(channelLayout),
        );

        return {
          success: true,
          message: "Loaded.",
          data: {
            primaryColor: row?.primaryColor ?? null,
            scannerLayout:
              (row?.scannerLayout as "horizontal" | "vertical") ?? "horizontal",
            discordNotifyOnScan: row?.discordNotifyOnScan ?? false,
            discordGuildId: row?.discordGuildId ?? null,
            scanRegion: toScanRegion(row),
            captureSettleDelayMs:
              row?.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS,
            moduleCount,
            channelLayout,
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
