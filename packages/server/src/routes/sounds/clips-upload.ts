import { SOUND_CLIPS_PER_ORG_LIMIT } from "@magic-vault/shared";
import { and, count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { authQuery } from "../../db";
import { soundClips } from "../../db/schema";
import {
  CUSTOM_SOUNDS_UPGRADE_MESSAGE,
  isCustomSoundsAllowed,
} from "../../lib/custom-sounds-access";
import { deleteObjects } from "../../lib/object-storage";
import { storeSoundClip } from "../../lib/sound-clips";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { parseSoundClipUpload, parseWaveform, toSoundClip } from "./shared";

export const uploadSoundClipRoute = new Hono<AppEnv>().post(
  "/clips",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const body = await c.req.parseBody();
    const upload = parseSoundClipUpload(body);
    if (!upload.success) {
      return c.json({ success: false, message: upload.message });
    }
    const { file, contentType, name } = upload;

    const allowed = await authQuery(c.get("jwtClaims"), (tx) =>
      isCustomSoundsAllowed(tx, orgId),
    );
    if (!allowed) {
      return c.json({
        success: false,
        message: CUSTOM_SOUNDS_UPGRADE_MESSAGE,
        upgradeRequired: true,
      });
    }

    try {
      const existing = await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .select({ total: count() })
          .from(soundClips)
          .where(
            and(eq(soundClips.orgId, orgId), eq(soundClips.isDeleted, false)),
          ),
      );
      if ((existing[0]?.total ?? 0) >= SOUND_CLIPS_PER_ORG_LIMIT) {
        return c.json({
          success: false,
          message: `You can store up to ${SOUND_CLIPS_PER_ORG_LIMIT} sound clips.`,
        });
      }

      const guid = randomUUID();
      const stored = await storeSoundClip(
        orgId,
        guid,
        Buffer.from(await file.arrayBuffer()),
        contentType,
      );
      try {
        const [row] = await authQuery(c.get("jwtClaims"), (tx) =>
          tx
            .insert(soundClips)
            .values({
              guid,
              name,
              contentType,
              sizeBytes: file.size,
              storageKey: stored.key,
              dataUrl: stored.dataUrl,
              waveform: parseWaveform(body["waveform"]),
              orgId,
            })
            .returning(),
        );
        return c.json({ success: true, data: await toSoundClip(row) });
      } catch (err) {
        deleteObjects([stored.key]);
        throw err;
      }
    } catch (err) {
      console.error(err);
      return c.json(
        { success: false, message: "Couldn't save the sound clip." },
        500,
      );
    }
  },
);
