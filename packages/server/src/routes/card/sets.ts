import { Hono } from "hono";
import { listCardSets } from "../../lib/card-search/card-sets";
import { resolveCardSearch } from "../../lib/card-search/resolve";
import { searchCardSets } from "../../lib/card-search/stored-cards";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const cardSetsRoute = new Hono<AppEnv>().get(
  "/sets",
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
    const query = c.req.query("q");
    try {
      return c.json({
        success: true,
        message: "Sets retrieved.",
        data: query
          ? await searchCardSets(resolved, query)
          : await listCardSets(resolved),
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
