import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadCollections } from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const listCollectionsRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), (tx) =>
        loadCollections(tx, orgId),
      );
      return c.json(result);
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
