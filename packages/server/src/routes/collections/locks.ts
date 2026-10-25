import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections } from "../../db/schema";
import { getLocksForGuids } from "../../lib/scan-lock";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const locksRoute = new Hono<AppEnv>().get(
  "/locks",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guids = await authQuery(c.get("jwtClaims"), async (tx) =>
      tx
        .select({ guid: collections.guid })
        .from(collections)
        .where(
          and(eq(collections.orgId, orgId), eq(collections.isDeleted, false)),
        ),
    );
    const data = getLocksForGuids(guids.map((r) => r.guid!).filter(Boolean));
    return c.json({ success: true, data });
  },
);
