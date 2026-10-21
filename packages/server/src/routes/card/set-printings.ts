import { Hono } from "hono";
import { listSetPrintings } from "../../lib/card-search/card-sets";
import { resolveCardSearch } from "../../lib/card-search/resolve";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const setPrintingsRoute = new Hono<AppEnv>().get(
  "/set-printings",
  requireAuth,
  requireOrg,
  async (c) => {
    const setCode = c.req.query("set")?.trim() ?? "";
    if (!setCode || setCode.length > 64) {
      return c.json({ success: false, message: "A set is required." }, 400);
    }
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
    try {
      return c.json({
        success: true,
        message: "Cards retrieved.",
        data: await listSetPrintings(resolved, setCode),
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
