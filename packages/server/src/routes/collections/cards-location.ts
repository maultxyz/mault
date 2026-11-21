import { Hono } from "hono";
import { authQuery } from "../../db";
import { loadCardStorageLocation } from "../../lib/collection-card-details";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const collectionCardLocationRoute = new Hono<AppEnv>().get(
  "/:guid/cards/:scanId/location",
  requireAuth,
  requireOrg,
  async (c) => {
    const data = await authQuery(c.get("jwtClaims"), (tx) =>
      loadCardStorageLocation(tx, c.get("orgId"), c.req.param("scanId")),
    );
    return c.json({ success: true, data });
  },
);
