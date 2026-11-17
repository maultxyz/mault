import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
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
    const rows = await authQuery(c.get("jwtClaims"), (tx) =>
      tx
        .select()
        .from(soundClips)
        .where(
          and(
            or(eq(soundClips.orgId, orgId), isNull(soundClips.orgId)),
            eq(soundClips.isDeleted, false),
          ),
        )
        .orderBy(asc(sql`${soundClips.orgId} IS NULL`), asc(soundClips.name)),
    );
    return c.json({
      success: true,
      data: await Promise.all(rows.map(toSoundClip)),
    });
  },
);
