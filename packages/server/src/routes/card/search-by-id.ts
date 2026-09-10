import { Hono } from "hono";
import { resolveCardSearch } from "../../lib/card-search/resolve";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const searchCardByIdRoute = new Hono<AppEnv>().get(
  "/search/:id",
  requireAuth,
  requireOrg,
  async (c) => {
    const resolved = await resolveCardSearch(
      c.get("jwtClaims"),
      c.req.query("collectionGuid"),
    );
    if (!resolved) {
      return c.json(
        { success: false, message: "No game configured for this collection." },
        400,
      );
    }
    const result = await resolved.adapter.searchById(
      c.req.param("id"),
      resolved.baseUrl,
    );
    return c.json(result);
  },
);
