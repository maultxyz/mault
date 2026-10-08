import { SOUND_RULE_NAME_MAX_LENGTH } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { z } from "zod";
import { nonEmptyRuleGroupSchema } from "./rule-group.schema";

export function createSoundRuleFormSchema(t: TFunction<"sounds">) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("ruleDialog.validation.nameRequired"))
      .max(SOUND_RULE_NAME_MAX_LENGTH),
    clipGuid: z.string().min(1, t("ruleDialog.validation.clipRequired")),
    isEnabled: z.boolean(),
    rules: nonEmptyRuleGroupSchema(
      t("ruleDialog.validation.conditionsRequired"),
    ),
  });
}

export type SoundRuleFormValues = z.infer<
  ReturnType<typeof createSoundRuleFormSchema>
>;
