import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { soundClips } from "../../db/schema";
import { deleteObjects } from "../../lib/object-storage";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const deleteSoundClipRoute = new Hono<AppEnv>().delete(
  "/clips/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const deleted = await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .delete(soundClips)
          .where(and(eq(soundClips.guid, guid), eq(soundClips.orgId, orgId)))
          .returning({ storageKey: soundClips.storageKey }),
      );
      deleteObjects(deleted.map((row) => row.storageKey));
      return c.json({ success: true, data: null });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
