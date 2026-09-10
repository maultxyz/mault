import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections } from "../../db/schema";
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
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.collections.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
          columns: { id: true },
        });
        if (!target) return { success: false, message: "Collection not found." };

        await tx
          .update(collections)
          .set({ isActive: false })
          .where(
            and(eq(collections.isActive, true), eq(collections.orgId, orgId)),
          );
        await tx
          .update(collections)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(collections.id, target.id));

        return loadCollections(tx, orgId);
      });
      if (result.success) emitToOrg(orgId, "collections_changed", { guid });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
