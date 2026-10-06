import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { soundClips } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { soundClipNameSchema, toSoundClip } from "./shared";

export const editSoundClipRoute = new Hono<AppEnv>().put(
  "/clips/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const name = soundClipNameSchema.safeParse(
      (await c.req.json<{ name?: unknown }>()).name,
    );
    if (!name.success) {
      return c.json({ success: false, message: "Give the clip a name." });
    }
    try {
      const [row] = await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .update(soundClips)
          .set({ name: name.data, updatedAt: new Date() })
          .where(
            and(
              eq(soundClips.guid, guid),
              eq(soundClips.orgId, orgId),
              eq(soundClips.isDeleted, false),
            ),
          )
          .returning(),
      );
      if (!row) {
        return c.json({ success: false, message: "Clip not found." }, 404);
      }
      return c.json({ success: true, data: await toSoundClip(row) });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
