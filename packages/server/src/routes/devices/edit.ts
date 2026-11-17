import {
  computeBinCount,
  DEFAULT_CHANNEL_LAYOUT,
  DEVICE_NAME_MAX_LENGTH,
  isLightBrightness,
  isLightColor,
  isLightMode,
  isLightLedCount,
  isPriceSource,
  isValueCelebrationDuration,
  isLightTimerSeconds,
  LIGHT_TIMER_MIN_SECONDS,
  LIGHT_TIMER_MAX_SECONDS,
  LIGHT_BRIGHTNESS_MAX,
  maxModulesForLayout,
  type ChannelLayout,
  type LightMode,
  type PriceSource,
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
      feederStopPulse?: number | null;
      checkBothOrientations?: boolean | null;
      flipCamera?: boolean;
      moduleCount?: number;
      channelLayout?: ChannelLayout;
      setupCompleted?: boolean;
      pipelinedFeed?: boolean;
      autoConnect?: boolean;
      testOnConnect?: boolean;
      lightMode?: LightMode;
      lightColor?: string;
      lightBrightness?: number;
      lightWhite?: number;
      lightLedCount?: number;
      valueCelebrationEnabled?: boolean;
      valueCelebrationThreshold?: number;
      valueCelebrationPriceSource?: PriceSource;
      valueCelebrationDurationMs?: number;
      lightWarningsEnabled?: boolean;
      lightEmptyWarningSeconds?: number;
      lightBlockedWarningSeconds?: number;
      lightNormalSeconds?: number;
    }>();
    if ("lightWarningsEnabled" in body && typeof body.lightWarningsEnabled !== "boolean") {
      return c.json({ success: false, message: "Lighting warnings enabled must be a boolean." }, 400);
    }
    for (const key of ["lightEmptyWarningSeconds", "lightBlockedWarningSeconds", "lightNormalSeconds"] as const) {
      if (key in body && !isLightTimerSeconds(body[key])) {
        return c.json({ success: false, message: `${key} must be an integer from ${LIGHT_TIMER_MIN_SECONDS} to ${LIGHT_TIMER_MAX_SECONDS} seconds.` }, 400);
      }
    }
    if ("valueCelebrationEnabled" in body && typeof body.valueCelebrationEnabled !== "boolean") {
      return c.json({ success: false, message: "Celebration enabled must be a boolean." }, 400);
    }
    if ("valueCelebrationThreshold" in body &&
      (typeof body.valueCelebrationThreshold !== "number" ||
        !Number.isFinite(body.valueCelebrationThreshold) ||
        body.valueCelebrationThreshold < 0)) {
      return c.json({ success: false, message: "Celebration threshold must be a finite non-negative number." }, 400);
    }
    if ("valueCelebrationPriceSource" in body && !isPriceSource(body.valueCelebrationPriceSource)) {
      return c.json({ success: false, message: "Unknown celebration price source." }, 400);
    }
    if ("valueCelebrationDurationMs" in body && !isValueCelebrationDuration(body.valueCelebrationDurationMs)) {
      return c.json({ success: false, message: "Celebration duration must be an integer from 500 to 3000 ms." }, 400);
    }
    if ("lightMode" in body && !isLightMode(body.lightMode)) {
      return c.json({ success: false, message: "Unknown light mode." }, 400);
    }
    if ("lightLedCount" in body && !isLightLedCount(body.lightLedCount)) {
      return c.json({ success: false, message: "LED count must be 8 or 16." }, 400);
    }
    if ("lightColor" in body && !isLightColor(body.lightColor)) {
      return c.json(
        { success: false, message: "Light color must be a #rrggbb hex color." },
        400,
      );
    }
    if ("lightBrightness" in body && !isLightBrightness(body.lightBrightness)) {
      return c.json(
        {
          success: false,
          message: `Light brightness must be an integer from 0 to ${LIGHT_BRIGHTNESS_MAX}.`,
        },
        400,
      );
    }
    if ("lightWhite" in body && !isLightBrightness(body.lightWhite)) {
      return c.json(
        {
          success: false,
          message: `Light white channel must be an integer from 0 to ${LIGHT_BRIGHTNESS_MAX}.`,
        },
        400,
      );
    }
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
            "hardwareId" in body
              ? (body.hardwareId ?? null)
              : device.hardwareId,
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
          feederStopPulse:
            "feederStopPulse" in body
              ? (body.feederStopPulse ?? null)
              : device.feederStopPulse,
          checkBothOrientations:
            "checkBothOrientations" in body
              ? (body.checkBothOrientations ?? null)
              : device.checkBothOrientations,
          flipCamera:
            typeof body.flipCamera === "boolean"
              ? body.flipCamera
              : device.flipCamera,
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
          lightMode: body.lightMode ?? device.lightMode,
          lightColor: body.lightColor?.toLowerCase() ?? device.lightColor,
          lightBrightness: body.lightBrightness ?? device.lightBrightness,
          lightWhite: body.lightWhite ?? device.lightWhite,
          lightLedCount: body.lightLedCount ?? device.lightLedCount,
          valueCelebrationEnabled: body.valueCelebrationEnabled ?? device.valueCelebrationEnabled,
          valueCelebrationThreshold: body.valueCelebrationThreshold ?? device.valueCelebrationThreshold,
          valueCelebrationPriceSource: body.valueCelebrationPriceSource ?? device.valueCelebrationPriceSource,
          valueCelebrationDurationMs: body.valueCelebrationDurationMs ?? device.valueCelebrationDurationMs,
          lightWarningsEnabled: body.lightWarningsEnabled ?? device.lightWarningsEnabled,
          lightEmptyWarningSeconds: body.lightEmptyWarningSeconds ?? device.lightEmptyWarningSeconds,
          lightBlockedWarningSeconds: body.lightBlockedWarningSeconds ?? device.lightBlockedWarningSeconds,
          lightNormalSeconds: body.lightNormalSeconds ?? device.lightNormalSeconds,
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
            .update(bins)
            .set({ isDeleted: true })
            .where(
              and(
                eq(bins.orgId, orgId),
                gt(bins.binNumber, newBinCount),
                eq(bins.isDeleted, false),
              ),
            );
          await tx
            .update(binRoutes)
            .set({ isDeleted: true })
            .where(
              and(
                eq(binRoutes.deviceId, device.id),
                gt(binRoutes.binNumber, newBinCount),
              ),
            );
          await tx
            .update(moduleConfigs)
            .set({ isDeleted: true })
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
