import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { soundClips } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toSoundClip } from "./shared";

export const listSoundClipsRoute = new Hono<AppEnv>().get(
  "/clips",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const rows = await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .select()
          .from(soundClips)
          .where(eq(soundClips.orgId, orgId))
          .orderBy(asc(soundClips.name)),
      );
      return c.json({
        success: true,
        data: await Promise.all(rows.map(toSoundClip)),
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
