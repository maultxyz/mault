import { DEFAULT_FEEDER_CALIBRATION, type FeederCalibration } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { rowToCalibration } from "./shared";

export const getFeederRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const row = await tx.query.feederConfigs.findFirst({
          where: (t, { eq }) => eq(t.orgId, orgId),
        });
        const calibration: FeederCalibration = row
          ? rowToCalibration(row)
          : { ...DEFAULT_FEEDER_CALIBRATION };
        return { success: true, message: "Loaded feeder config.", data: calibration };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
