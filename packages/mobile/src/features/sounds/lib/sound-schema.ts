import { z } from "zod";
import { SOUND_CLIP_NAME_MAX_LENGTH, SOUND_RULE_NAME_MAX_LENGTH, type BinRuleGroup } from "@magic-vault/shared";

export const soundRulesDraftSchema = z.object({
  order: z.array(z.string()),
  enabled: z.record(z.string(), z.boolean()),
});

export const soundRuleSchema = z.object({
  name: z.string().trim().min(1).max(SOUND_RULE_NAME_MAX_LENGTH),
  clipGuid: z.string().min(1),
  isEnabled: z.boolean(),
  rules: z.custom<BinRuleGroup>((value) => !!value && typeof value === "object" && "conditions" in value),
});

export const soundClipNameSchema = z.object({
  name: z.string().trim().min(1).max(SOUND_CLIP_NAME_MAX_LENGTH),
});
