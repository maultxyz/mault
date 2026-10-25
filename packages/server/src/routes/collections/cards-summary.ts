import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { readCardsSummary } from "./cards-read";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const collectionCardsSummaryRoute = new Hono<AppEnv>().get(
  "/:guid/cards/summary",
  requireAuth,
  requireOrg,
  async (c) => {
    try {
      const data = await readCardsSummary(
        (fn) => authQuery(c.get("jwtClaims"), fn),
        c.req.param("guid"),
        c.get("orgId"),
        c.req.query(),
      );
      if (!data) {
        return c.json({ success: false, message: "Collection not found." });
      }
      return c.json({ success: true, data });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
