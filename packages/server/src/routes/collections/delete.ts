import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collections } from "../../db/schema";
import { emitToOrg } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadCollections } from "./shared";

export const deleteCollectionRoute = new Hono<AppEnv>().delete(
  "/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.collections.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
          columns: { id: true, isActive: true },
        });
        if (!target) return { success: false, message: "Collection not found." };

        await tx
          .update(collections)
          .set({ isDeleted: true, isActive: false })
          .where(eq(collections.id, target.id));

        if (target.isActive) {
          const next = await tx.query.collections.findFirst({
            where: (t, { eq, and }) =>
              and(eq(t.orgId, orgId), eq(t.isDeleted, false)),
            orderBy: (t, { desc }) => [desc(t.updatedAt)],
            columns: { id: true },
          });
          if (next) {
            await tx
              .update(collections)
              .set({ isActive: true })
              .where(eq(collections.id, next.id));
          }
        }

        return loadCollections(tx, orgId);
      });
      if (result.success) {
        emitToOrg(orgId, "collections_changed", { guid });
      }
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
