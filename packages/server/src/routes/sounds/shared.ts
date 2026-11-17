import type { BinRuleGroup, SoundClip, SoundRule } from "@magic-vault/shared";
import {
  SOUND_CLIP_EXTENSIONS,
  SOUND_CLIP_MAX_BYTES,
  SOUND_CLIP_NAME_MAX_LENGTH,
  SOUND_CLIP_WAVEFORM_BARS,
  SOUND_RULE_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import type { Transaction } from "../../db";
import { games, soundClips, soundRules } from "../../db/schema";
import type { SoundClipUploadParseResult } from "../../lib/interfaces/sounds";
import { findGameId, ruleGroupSchema } from "../../lib/rule-groups";
import { resolveSoundClipUrl } from "../../lib/sound-clips";

export { findGameId };

export const soundRuleInputSchema = z.object({
  name: z.string().trim().min(1).max(SOUND_RULE_NAME_MAX_LENGTH),
  isEnabled: z.boolean(),
  rules: ruleGroupSchema,
  clipGuid: z.string().uuid().nullable(),
});

export const waveformSchema = z
  .array(z.number().min(0).max(1))
  .length(SOUND_CLIP_WAVEFORM_BARS);

export function parseWaveform(value: unknown): number[] | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = waveformSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const soundClipNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(SOUND_CLIP_NAME_MAX_LENGTH);

export function parseSoundClipUpload(
  body: Record<string, unknown>,
): SoundClipUploadParseResult {
  const file = body["file"];
  if (!(file instanceof File)) {
    return { success: false, message: "No sound file provided." };
  }
  const contentType = file.type.split(";")[0].trim().toLowerCase();
  if (!SOUND_CLIP_EXTENSIONS[contentType]) {
    return {
      success: false,
      message: "Use an MP3, WAV, OGG, WebM, M4A or AAC file.",
    };
  }
  if (file.size > SOUND_CLIP_MAX_BYTES) {
    return { success: false, message: "Sound clips can be at most 1 MB." };
  }
  const name = soundClipNameSchema.safeParse(
    typeof body["name"] === "string" ? body["name"] : file.name,
  );
  if (!name.success) {
    return { success: false, message: "Give the clip a name." };
  }
  return { success: true, file, contentType, name: name.data };
}

export async function toSoundClip(
  row: typeof soundClips.$inferSelect,
): Promise<SoundClip> {
  return {
    guid: row.guid!,
    name: row.name,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    url: await resolveSoundClipUrl(row),
    waveform: (row.waveform as number[] | null) ?? null,
    isSystem: row.orgId === null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSoundRule(row: {
  guid: string | null;
  gameGuid: string | null;
  name: string;
  position: number;
  isEnabled: boolean;
  rules: unknown;
  clipGuid: string | null;
}): SoundRule {
  return {
    guid: row.guid!,
    gameGuid: row.gameGuid!,
    name: row.name,
    position: row.position,
    isEnabled: row.isEnabled,
    rules: row.rules as BinRuleGroup,
    clipGuid: row.clipGuid,
  };
}

export async function findClipId(
  tx: Transaction,
  orgId: string,
  clipGuid: string | null,
): Promise<number | null | undefined> {
  if (!clipGuid) return null;
  const clip = await tx.query.soundClips.findFirst({
    where: and(
      eq(soundClips.guid, clipGuid),
      or(eq(soundClips.orgId, orgId), isNull(soundClips.orgId)),
      eq(soundClips.isDeleted, false),
    ),
    columns: { id: true },
  });
  return clip?.id;
}

export async function loadSoundRules(
  tx: Transaction,
  orgId: string,
  gameId: number,
): Promise<SoundRule[]> {
  const rows = await tx
    .select({
      guid: soundRules.guid,
      gameGuid: games.guid,
      name: soundRules.name,
      position: soundRules.position,
      isEnabled: soundRules.isEnabled,
      rules: soundRules.rules,
      clipGuid: soundClips.guid,
    })
    .from(soundRules)
    .innerJoin(games, eq(games.id, soundRules.gameId))
    .leftJoin(
      soundClips,
      and(
        eq(soundClips.id, soundRules.clipId),
        eq(soundClips.isDeleted, false),
      ),
    )
    .where(
      and(
        eq(soundRules.orgId, orgId),
        eq(soundRules.gameId, gameId),
        eq(soundRules.isDeleted, false),
      ),
    )
    .orderBy(asc(soundRules.position), asc(soundRules.id));
  return rows.map(toSoundRule);
}
