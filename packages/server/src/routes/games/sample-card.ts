import { Hono } from "hono";
import { ADAPTERS_BY_GAME_KEY } from "../../lib/card-search/resolve";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

// GET /games/sample-card?key=pokemon&query=pikachu — searches the game's
// adapter for a real card so the field-mapping UI can offer real paths
// instead of asking admins to type them blind. Keyed by `key`, not `guid`,
// so it works while creating a new game too (before it has a row/guid).
export const sampleCardRoute = new Hono<AppEnv>().get(
  "/sample-card",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const key = c.req.query("key");
    const query = c.req.query("query");
    if (!key) {
      return c.json({ success: false, message: "key is required." }, 400);
    }
    if (!query?.trim()) {
      return c.json({ success: false, message: "query is required." }, 400);
    }

    const adapter = ADAPTERS_BY_GAME_KEY[key];
    if (!adapter) {
      return c.json(
        { success: false, message: `No card source for game key: ${key}` },
        400,
      );
    }

    try {
      const result = await adapter.search(query, adapter.defaultUrl, "en");
      if (!result.success || !result.data?.length) {
        return c.json(
          { success: false, message: result.message || "No cards found." },
          404,
        );
      }

      const card = result.data[0];
      return c.json({
        success: true,
        data: { name: card.name, raw: card.raw },
      });
    } catch (err) {
      console.error(err);
      return c.json(
        { success: false, message: "Failed to fetch sample card." },
        502,
      );
    }
  },
);
