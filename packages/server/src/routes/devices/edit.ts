import {
  computeBinCount,
  DEFAULT_CHANNEL_LAYOUT,
  DEVICE_NAME_MAX_LENGTH,
  maxModulesForLayout,
  type ChannelLayout,
} from "@magic-vault/shared";
import { and, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binRoutes, bins, devices, moduleConfigs } from "../../db/schema";
import { getDeviceByGuid } from "../../lib/devices";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toDevice } from "./shared";

export const editDeviceRoute = new Hono<AppEnv>().put(
  "/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const body = await c.req.json<{
      name?: string;
      hardwareId?: string | null;
      scanRegion?: {
        coverage: number;
        offsetX: number;
        offsetY: number;
      } | null;
      captureSettleDelayMs?: number | null;
      matchesNeeded?: number | null;
      checkBothOrientations?: boolean | null;
      moduleCount?: number;
      channelLayout?: ChannelLayout;
      setupCompleted?: boolean;
      pipelinedFeed?: boolean;
      autoConnect?: boolean;
      testOnConnect?: boolean;
    }>();
    if (
      "channelLayout" in body &&
      body.channelLayout !== DEFAULT_CHANNEL_LAYOUT
    ) {
      return c.json(
        { success: false, message: "Only the standard channel layout can be set." },
        400,
      );
    }
    if ("name" in body) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > DEVICE_NAME_MAX_LENGTH) {
        return c.json(
          {
            success: false,
            message: `Name must be 1 to ${DEVICE_NAME_MAX_LENGTH} characters.`,
          },
          400,
        );
      }
      body.name = name;
    }
    if (body.setupCompleted === false && c.get("userRole") !== "admin") {
      return c.json({ success: false, message: "Forbidden." }, 403);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const device = await getDeviceByGuid(tx, orgId, guid);
        if (!device) return { success: false, message: "Device not found." };

        const channelLayout: ChannelLayout =
          "channelLayout" in body && body.channelLayout
            ? body.channelLayout
            : ((device.channelLayout as ChannelLayout | null) ??
              DEFAULT_CHANNEL_LAYOUT);

        const merged = {
          name: "name" in body && body.name ? body.name : device.name,
          hardwareId:
            "hardwareId" in body ? body.hardwareId : device.hardwareId,
          scanCoverage:
            "scanRegion" in body
              ? body.scanRegion
                ? Math.round(body.scanRegion.coverage * 100)
                : null
              : device.scanCoverage,
          scanOffsetX:
            "scanRegion" in body
              ? body.scanRegion
                ? Math.round(body.scanRegion.offsetX * 100)
                : null
              : device.scanOffsetX,
          scanOffsetY:
            "scanRegion" in body
              ? body.scanRegion
                ? Math.round(body.scanRegion.offsetY * 100)
                : null
              : device.scanOffsetY,
          captureSettleDelayMs:
            "captureSettleDelayMs" in body
              ? (body.captureSettleDelayMs ?? null)
              : device.captureSettleDelayMs,
          matchesNeeded:
            "matchesNeeded" in body
              ? (body.matchesNeeded ?? null)
              : device.matchesNeeded,
          checkBothOrientations:
            "checkBothOrientations" in body
              ? (body.checkBothOrientations ?? null)
              : device.checkBothOrientations,
          channelLayout,
          setupCompletedAt:
            "setupCompleted" in body
              ? body.setupCompleted
                ? (device.setupCompletedAt ?? new Date())
                : null
              : device.setupCompletedAt,
          pipelinedFeed:
            typeof body.pipelinedFeed === "boolean"
              ? body.pipelinedFeed
              : device.pipelinedFeed,
          autoConnect:
            typeof body.autoConnect === "boolean"
              ? body.autoConnect
              : device.autoConnect,
          testOnConnect:
            typeof body.testOnConnect === "boolean"
              ? body.testOnConnect
              : device.testOnConnect,
          moduleCount:
            "moduleCount" in body && body.moduleCount != null
              ? Math.min(
                  Math.max(Math.round(body.moduleCount), 1),
                  maxModulesForLayout(channelLayout),
                )
              : Math.min(
                  device.moduleCount,
                  maxModulesForLayout(channelLayout),
                ),
        };

        const updatedAt = new Date();
        await tx
          .update(devices)
          .set({ ...merged, updatedAt })
          .where(eq(devices.id, device.id));

        const previousModuleCount = device.moduleCount;
        if (merged.moduleCount < previousModuleCount) {
          const newBinCount = computeBinCount(merged.moduleCount);
          await tx
            .delete(bins)
            .where(and(eq(bins.orgId, orgId), gt(bins.binNumber, newBinCount)));
          await tx
            .delete(binRoutes)
            .where(
              and(
                eq(binRoutes.deviceId, device.id),
                gt(binRoutes.binNumber, newBinCount),
              ),
            );
          await tx
            .delete(moduleConfigs)
            .where(
              and(
                eq(moduleConfigs.deviceId, device.id),
                gt(moduleConfigs.moduleNumber, merged.moduleCount),
              ),
            );
        }

        return {
          success: true,
          message: "Saved device.",
          data: toDevice({ ...device, ...merged, updatedAt }),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
