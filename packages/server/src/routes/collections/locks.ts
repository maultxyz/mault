import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections } from "../../db/schema";
import { getLocksForGuids } from "../../lib/scan-lock";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

// GET /collections/locks — returns { [guid]: ScanLock } for collections currently locked by a scanner
export const locksRoute = new Hono<AppEnv>().get(
  "/locks",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const guids = await authQuery(c.get("jwtClaims"), async (tx) =>
        tx
          .select({ guid: collections.guid })
          .from(collections)
          .where(eq(collections.orgId, orgId)),
      );
      const data = getLocksForGuids(guids.map((r) => r.guid!).filter(Boolean));
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
