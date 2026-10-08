import { NOTIFICATION_RULE_NAME_MAX_LENGTH } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { z } from "zod";
import { nonEmptyRuleGroupSchema } from "./rule-group.schema";

export function createNotificationRuleFormSchema(t: TFunction<"integrations">) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("ruleDialog.validation.nameRequired"))
      .max(NOTIFICATION_RULE_NAME_MAX_LENGTH),
    channelId: z.string().min(1, t("ruleDialog.validation.channelRequired")),
    roleId: z.string().nullable(),
    isEnabled: z.boolean(),
    rules: nonEmptyRuleGroupSchema(
      t("ruleDialog.validation.conditionsRequired"),
    ),
  });
}

export type NotificationRuleFormValues = z.infer<
  ReturnType<typeof createNotificationRuleFormSchema>
>;
