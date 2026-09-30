import type { BinRuleGroup, SoundClip, SoundRule } from "@magic-vault/shared";
import {
  SOUND_CLIP_NAME_MAX_LENGTH,
  SOUND_CLIP_WAVEFORM_BARS,
  SOUND_RULE_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Transaction } from "../../db";
import { games, soundClips, soundRules } from "../../db/schema";
import { resolveSoundClipUrl } from "../../lib/sound-clips";

const conditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: z.string(),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

const ruleGroupSchema: z.ZodType<BinRuleGroup> = z.lazy(() =>
  z.object({
    id: z.string(),
    combinator: z.enum(["and", "or"]),
    conditions: z.array(z.union([ruleGroupSchema, conditionSchema])),
  }),
) as z.ZodType<BinRuleGroup>;

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

export async function findGameId(
  tx: Transaction,
  gameGuid: string,
): Promise<number | null> {
  const game = await tx.query.games.findFirst({
    where: eq(games.guid, gameGuid),
    columns: { id: true },
  });
  return game?.id ?? null;
}

export async function findClipId(
  tx: Transaction,
  orgId: string,
  clipGuid: string | null,
): Promise<number | null | undefined> {
  if (!clipGuid) return null;
  const clip = await tx.query.soundClips.findFirst({
    where: and(eq(soundClips.guid, clipGuid), eq(soundClips.orgId, orgId)),
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
    .leftJoin(soundClips, eq(soundClips.id, soundRules.clipId))
    .where(and(eq(soundRules.orgId, orgId), eq(soundRules.gameId, gameId)))
    .orderBy(asc(soundRules.position), asc(soundRules.id));
  return rows.map(toSoundRule);
}
