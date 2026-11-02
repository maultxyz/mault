import { PLATFORM_STAFF_ROLES } from "@magic-vault/shared";
import { and, asc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { db } from "../../db";
import { soundClips } from "../../db/schema";
import { deleteObjects } from "../../lib/object-storage";
import { storeSoundClip } from "../../lib/sound-clips";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import {
  parseSoundClipUpload,
  parseWaveform,
  soundClipNameSchema,
  toSoundClip,
} from "../sounds/shared";

const liveSystemClip = (guid: string) =>
  and(
    eq(soundClips.guid, guid),
    isNull(soundClips.orgId),
    eq(soundClips.isDeleted, false),
  );

export const systemSoundClipsRoute = new Hono<AppEnv>()
  .get(
    "/sound-clips",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const rows = await db
        .select()
        .from(soundClips)
        .where(and(isNull(soundClips.orgId), eq(soundClips.isDeleted, false)))
        .orderBy(asc(soundClips.name));
      return c.json({
        success: true,
        data: await Promise.all(rows.map(toSoundClip)),
      });
    },
  )
  .post(
    "/sound-clips",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const body = await c.req.parseBody();
      const upload = parseSoundClipUpload(body);
      if (!upload.success) {
        return c.json({ success: false, message: upload.message });
      }
      const guid = randomUUID();
      const stored = await storeSoundClip(
        null,
        guid,
        Buffer.from(await upload.file.arrayBuffer()),
        upload.contentType,
      );
      const [row] = await db
        .insert(soundClips)
        .values({
          guid,
          name: upload.name,
          contentType: upload.contentType,
          sizeBytes: upload.file.size,
          storageKey: stored.key,
          dataUrl: stored.dataUrl,
          waveform: parseWaveform(body["waveform"]),
          orgId: null,
        })
        .returning()
        .catch((err: unknown) => {
          deleteObjects([stored.key]);
          throw err;
        });
      return c.json({ success: true, data: await toSoundClip(row) });
    },
  )
  .put(
    "/sound-clips/:guid",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      const name = soundClipNameSchema.safeParse(
        (await c.req.json<{ name?: unknown }>()).name,
      );
      if (!name.success) {
        return c.json({ success: false, message: "Give the clip a name." });
      }
      const [row] = await db
        .update(soundClips)
        .set({ name: name.data, updatedAt: new Date() })
        .where(liveSystemClip(c.req.param("guid")))
        .returning();
      if (!row) {
        return c.json({ success: false, message: "Clip not found." }, 404);
      }
      return c.json({ success: true, data: await toSoundClip(row) });
    },
  )
  .delete(
    "/sound-clips/:guid",
    requireAuth,
    requireRole(...PLATFORM_STAFF_ROLES),
    async (c) => {
      await db
        .update(soundClips)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(liveSystemClip(c.req.param("guid")));
      return c.json({ success: true, data: null });
    },
  );
