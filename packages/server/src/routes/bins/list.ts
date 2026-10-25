import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets } from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const listBinSetsRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), (tx) =>
        loadSets(tx, orgId),
      );
      return c.json(result);
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
