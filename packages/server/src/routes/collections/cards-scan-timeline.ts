import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { readScanTimelineBuckets } from "./cards-read";

export const collectionCardsScanTimelineRoute = new Hono<AppEnv>().get(
  "/:guid/cards/scan-timeline",
  requireAuth,
  requireOrg,
  async (c) => {
    const data = await readScanTimelineBuckets(
      (fn) => authQuery(c.get("jwtClaims"), fn),
      c.req.param("guid"),
      c.get("orgId"),
      c.req.query(),
    );
    if (data === "invalid_params") {
      return c.json(
        { success: false, message: "Unknown grouping or time zone." },
        400,
      );
    }
    if (!data) {
      return c.json({ success: false, message: "Collection not found." });
    }
    return c.json({ success: true, data });
  },
);
