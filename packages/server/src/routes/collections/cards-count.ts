import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { readCardsCount } from "./cards-read";

export const collectionCardsCountRoute = new Hono<AppEnv>().get(
  "/:guid/cards/count",
  requireAuth,
  requireOrg,
  async (c) => {
    const data = await readCardsCount(
      (fn) => authQuery(c.get("jwtClaims"), fn),
      c.req.param("guid"),
      c.get("orgId"),
      c.req.query(),
    );
    if (!data) {
      return c.json({ success: false, message: "Collection not found." });
    }
    return c.json({ success: true, data });
  },
);
