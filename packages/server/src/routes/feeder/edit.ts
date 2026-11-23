import { FEED_RETRY_COUNT_MAX, FEED_RETRY_COUNT_MIN } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { feederConfigAudit, feederConfigs } from "../../db/schema";
import { pickCalibrationValues } from "../../lib/calibration-input";
import {
  CALIBRATION_INPUT_INVALID_MESSAGE,
  FEEDER_CALIBRATION_INPUT_KEYS,
} from "../../lib/constants/calibration-input";
import { getDeviceByGuid } from "../../lib/devices";
import {
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";
import { rowToCalibration } from "./shared";

export const editFeederRoute = new Hono<AppEnv>().put(
  "/",
  requireAuth,
  requireOrg,
  rejectWhileImpersonating,
  async (c) => {
    const orgId = c.get("orgId");
    const deviceGuid = c.req.param("guid") as string;
    const calibration = pickCalibrationValues(
      await c.req.json().catch(() => null),
      FEEDER_CALIBRATION_INPUT_KEYS,
    );
    if (!calibration) {
      return c.json({ success: false, message: CALIBRATION_INPUT_INVALID_MESSAGE }, 400);
    }
    const { feedRetryCount } = calibration;
    if (
      feedRetryCount !== undefined &&
      (!Number.isInteger(feedRetryCount) ||
        feedRetryCount < FEED_RETRY_COUNT_MIN ||
        feedRetryCount > FEED_RETRY_COUNT_MAX)
    ) {
      return c.json(
        {
          success: false,
          message: `feedRetryCount must be a whole number from ${FEED_RETRY_COUNT_MIN} to ${FEED_RETRY_COUNT_MAX}.`,
        },
        400,
      );
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const device = await getDeviceByGuid(tx, orgId, deviceGuid);
      if (!device) return { success: false, message: "Device not found." };

      await tx
        .insert(feederConfigs)
        .values({ ...calibration, orgId, deviceId: device.id })
        .onConflictDoUpdate({
          target: [feederConfigs.deviceId],
          set: { ...calibration, updatedAt: new Date() },
        });

      await tx
        .insert(feederConfigAudit)
        .values({ ...calibration, orgId, deviceId: device.id });

      const row = await tx.query.feederConfigs.findFirst({
        where: (t, { eq }) => eq(t.deviceId, device.id),
      });
      if (!row) return { success: false, message: "Device not found." };
      return { success: true, message: "Saved feeder config.", data: rowToCalibration(row) };
    });
    return c.json(result);
  },
);
