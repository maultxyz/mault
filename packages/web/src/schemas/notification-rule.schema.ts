import {
  NOTIFICATION_RULE_NAME_MAX_LENGTH,
  type BinRuleGroup,
} from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { z } from "zod";

export function createNotificationRuleFormSchema(
  t: TFunction<"integrations">,
) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("ruleDialog.validation.nameRequired"))
      .max(NOTIFICATION_RULE_NAME_MAX_LENGTH),
    channelId: z.string().min(1, t("ruleDialog.validation.channelRequired")),
    roleId: z.string().nullable(),
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

export type NotificationRuleFormValues = z.infer<
  ReturnType<typeof createNotificationRuleFormSchema>
>;
