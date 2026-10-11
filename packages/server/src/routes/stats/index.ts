import {
  STATS_DEFAULT_RANGE,
  STATS_RANGES,
  type StatsRange,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { loadStatsReport } from "../../lib/stats-report";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

function parseRange(value: string | undefined): StatsRange {
  return STATS_RANGES.find((range) => range === value) ?? STATS_DEFAULT_RANGE;
}

const router = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    try {
      const data = await authQuery(c.get("jwtClaims"), (tx) =>
        loadStatsReport(
          tx,
          c.get("orgId"),
          parseRange(c.req.query("range")),
          c.req.query("collection") || null,
        ),
      );
      if (!data) {
        return c.json(
          { success: false, message: "Collection not found." },
          404,
        );
      }
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);

export { router as statsRouter };
