import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadCollections } from "./shared";

export const listCollectionsRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const result = await authQuery(c.get("jwtClaims"), (tx) =>
      loadCollections(tx, orgId),
    );
    return c.json(result);
  },
);
