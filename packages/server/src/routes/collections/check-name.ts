import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { collectionNameTaken } from "./shared";

export const checkCollectionNameRoute = new Hono<AppEnv>().get(
  "/check-name",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const name = c.req.query("name")?.trim();
    const excludeGuid = c.req.query("excludeGuid") || undefined;
    if (!name) {
      return c.json({ success: false, message: "name is required." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const taken = await collectionNameTaken(tx, orgId, name, excludeGuid);
        return {
          success: true,
          message: "Checked.",
          data: { available: !taken },
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
