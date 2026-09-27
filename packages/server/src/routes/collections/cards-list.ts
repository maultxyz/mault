import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { readCardsPage } from "./cards-read";

export const listCollectionCardsRoute = new Hono<AppEnv>().get(
  "/:guid/cards",
  requireAuth,
  requireOrg,
  async (c) => {
    try {
      const data = await readCardsPage(
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
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
