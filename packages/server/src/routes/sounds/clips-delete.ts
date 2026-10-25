import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { soundClips } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const deleteSoundClipRoute = new Hono<AppEnv>().delete(
  "/clips/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .update(soundClips)
          .set({ isDeleted: true })
          .where(
            and(
              eq(soundClips.guid, guid),
              eq(soundClips.orgId, orgId),
              eq(soundClips.isDeleted, false),
            ),
          ),
      );
      return c.json({ success: true, data: null });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
