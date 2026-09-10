import {
  computeBinCount,
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_MODULE_COUNT,
  maxModulesForLayout,
  type ChannelLayout,
} from "@magic-vault/shared";
import { and, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binRoutes, bins, moduleConfigs, orgSettings } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { detectDefaultChannelLayout, toScanRegion } from "./shared";

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
      scanRegion?: { coverage: number; offsetX: number; offsetY: number } | null;
      captureSettleDelayMs?: number | null;
      moduleCount?: number;
      channelLayout?: ChannelLayout;
    }>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const existing = await tx.query.orgSettings.findFirst({
          where: eq(orgSettings.orgId, orgId),
        });

        const channelLayout: ChannelLayout =
          "channelLayout" in body && body.channelLayout
            ? body.channelLayout
            : ((existing?.channelLayout as ChannelLayout | null) ??
              (await detectDefaultChannelLayout(tx, orgId)));

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
          scanCoverage:
            "scanRegion" in body
              ? body.scanRegion
                ? Math.round(body.scanRegion.coverage * 100)
                : null
              : (existing?.scanCoverage ?? null),
          scanOffsetX:
            "scanRegion" in body
              ? body.scanRegion
                ? Math.round(body.scanRegion.offsetX * 100)
                : null
              : (existing?.scanOffsetX ?? null),
          scanOffsetY:
            "scanRegion" in body
              ? body.scanRegion
                ? Math.round(body.scanRegion.offsetY * 100)
                : null
              : (existing?.scanOffsetY ?? null),
          captureSettleDelayMs:
            "captureSettleDelayMs" in body
              ? (body.captureSettleDelayMs ?? null)
              : (existing?.captureSettleDelayMs ?? null),
          channelLayout,
          moduleCount:
            "moduleCount" in body && body.moduleCount != null
              ? Math.min(
                  Math.max(Math.round(body.moduleCount), 1),
                  maxModulesForLayout(channelLayout),
                )
              : Math.min(
                  existing?.moduleCount ?? DEFAULT_MODULE_COUNT,
                  maxModulesForLayout(channelLayout),
                ),
        };
        await tx
          .insert(orgSettings)
          .values({ orgId, ...merged })
          .onConflictDoUpdate({
            target: [orgSettings.orgId],
            set: { ...merged, updatedAt: new Date() },
          });

        const previousModuleCount = existing?.moduleCount ?? DEFAULT_MODULE_COUNT;
        if (merged.moduleCount < previousModuleCount) {
          const newBinCount = computeBinCount(merged.moduleCount);
          await tx
            .delete(bins)
            .where(and(eq(bins.orgId, orgId), gt(bins.binNumber, newBinCount)));
          await tx
            .delete(binRoutes)
            .where(
              and(
                eq(binRoutes.orgId, orgId),
                gt(binRoutes.binNumber, newBinCount),
              ),
            );
          await tx
            .delete(moduleConfigs)
            .where(
              and(
                eq(moduleConfigs.orgId, orgId),
                gt(moduleConfigs.moduleNumber, merged.moduleCount),
              ),
            );
        }

        return {
          success: true,
          message: "Saved.",
          data: {
            primaryColor: merged.primaryColor,
            scannerLayout:
              (merged.scannerLayout as "horizontal" | "vertical") ?? "horizontal",
            discordNotifyOnScan: merged.discordNotifyOnScan,
            scanRegion: toScanRegion(merged),
            captureSettleDelayMs:
              merged.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS,
            moduleCount: merged.moduleCount,
            channelLayout: merged.channelLayout,
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
