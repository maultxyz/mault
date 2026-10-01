import { SOUND_RULE_NAME_MAX_LENGTH, type BinRuleGroup } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { z } from "zod";

export function createSoundRuleFormSchema(t: TFunction<"sounds">) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("ruleDialog.validation.nameRequired"))
      .max(SOUND_RULE_NAME_MAX_LENGTH),
    clipGuid: z.string().min(1, t("ruleDialog.validation.clipRequired")),
    isEnabled: z.boolean(),
    rules: z.custom<BinRuleGroup>(
      (value) =>
        !!value &&
        typeof value === "object" &&
        Array.isArray((value as BinRuleGroup).conditions) &&
        (value as BinRuleGroup).conditions.length > 0,
      t("ruleDialog.validation.conditionsRequired"),
    ),
  });
}

export type SoundRuleFormValues = z.infer<
  ReturnType<typeof createSoundRuleFormSchema>
>;
