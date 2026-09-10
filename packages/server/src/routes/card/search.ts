import { Hono } from "hono";
import { resolveCardSearch } from "../../lib/card-search/resolve";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const searchCardRoute = new Hono<AppEnv>().get(
  "/search",
  requireAuth,
  requireOrg,
  async (c) => {
    const query = c.req.query("q") ?? "";
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
    const result = await resolved.adapter.search(
      query,
      resolved.baseUrl,
      resolved.lang,
    );
    return c.json(result);
  },
);
