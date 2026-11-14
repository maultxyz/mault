import { Hono } from "hono";
import { authQuery } from "../../db";
import { activateScanCollection } from "../../lib/scan-targets";
import { emitToOrg } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadCollections } from "./shared";

export const setCollectionActiveRoute = new Hono<AppEnv>().put(
  "/:guid/active",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      if (!(await activateScanCollection(tx, orgId, guid)))
        return { success: false, message: "Collection not found." };
      return loadCollections(tx, orgId);
    });
    if (result.success) emitToOrg(orgId, "collections_changed", { guid });
    return c.json(result);
  },
);
