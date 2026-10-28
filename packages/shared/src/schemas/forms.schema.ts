import { z } from "zod";
import { API_KEY_NAME_MAX_LENGTH } from "../constants/api-keys.constant";
import { SYNC_API_KEY_PERMISSIONS } from "../constants/sync-api-keys.constant";
import { CARD_CONDITIONS } from "../constants/card-condition.constant";
import {
  ORGANIZATION_NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  WEBHOOK_FORM_URL_PATTERN,
} from "../constants/form-validation.constant";
import { NOTIFICATION_RULE_NAME_MAX_LENGTH } from "../constants/integrations.constant";
import { PRICE_SOURCES } from "../constants/price-source.constant";
import { SET_NAME_MAX_LENGTH } from "../constants/sort-bins.constant";
import { STORAGE_LOCATION_NAME_MAX_LENGTH } from "../constants/sorters.constant";
import {
  SOUND_CLIP_NAME_MAX_LENGTH,
  SOUND_RULE_NAME_MAX_LENGTH,
} from "../constants/sounds.constant";
import {
  WEBHOOK_DESCRIPTION_MAX_LENGTH,
  WEBHOOK_EVENTS,
  WEBHOOK_URL_MAX_LENGTH,
} from "../constants/webhooks.constant";
import { isConditionMultiplier } from "../card-condition";
import { formValidationMessage } from "../form-validation";
import type {
  CardCondition,
  ConditionMultipliers,
} from "../interfaces/card-condition.interface";
import type { PriceSource } from "../interfaces/price-source.interface";
import type { BinRuleGroup } from "../interfaces/sort-bins.interface";

function nameSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, formValidationMessage("nameRequired"))
    .max(maxLength, formValidationMessage("nameTooLong", { max: maxLength }));
}

const emailSchema = z
  .string()
  .trim()
  .email(formValidationMessage("emailInvalid"));

export function nonEmptyRuleGroupSchema() {
  return z.custom<BinRuleGroup>(
    (value) =>
      !!value &&
      typeof value === "object" &&
      Array.isArray((value as BinRuleGroup).conditions) &&
      (value as BinRuleGroup).conditions.length > 0,
    formValidationMessage("conditionsRequired"),
  );
}

export const updateNameFormSchema = z.object({
  name: z.string().trim().min(1, formValidationMessage("nameRequired")),
});

export const changeEmailFormSchema = z.object({ newEmail: emailSchema });

export const changePasswordFormSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, formValidationMessage("currentPasswordRequired")),
    newPassword: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        formValidationMessage("passwordTooShort", { min: PASSWORD_MIN_LENGTH }),
      ),
    confirmPassword: z.string(),
    revokeOtherSessions: z.boolean(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: formValidationMessage("passwordMismatch"),
    path: ["confirmPassword"],
  });

export const createCollectionFormSchema = z.object({
  name: nameSchema(SET_NAME_MAX_LENGTH),
  gameGuid: z.string().min(1, formValidationMessage("gameRequired")),
  lang: z.string().min(1, formValidationMessage("languageRequired")),
  matchAllLanguages: z.boolean(),
});

export const renameCollectionFormSchema = z.object({
  name: nameSchema(SET_NAME_MAX_LENGTH),
});

export const organizationNameFormSchema = z.object({
  name: nameSchema(ORGANIZATION_NAME_MAX_LENGTH),
});

export const organizationInviteFormSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "member"]),
});

export const orgApiKeyFormSchema = z.object({
  name: nameSchema(API_KEY_NAME_MAX_LENGTH),
  allowWrite: z.boolean(),
});

export const syncApiKeyFormSchema = z.object({
  name: nameSchema(API_KEY_NAME_MAX_LENGTH),
  permissions: z
    .array(z.enum(SYNC_API_KEY_PERMISSIONS))
    .min(1, formValidationMessage("permissionsRequired")),
});

export const storageLocationNameFormSchema = z.object({
  name: nameSchema(STORAGE_LOCATION_NAME_MAX_LENGTH),
});

export const scanDraftFormSchema = z.object({
  foilType: z.string().nullable(),
  condition: z.enum(CARD_CONDITIONS as [CardCondition, ...CardCondition[]]),
  language: z.string().min(1),
  acquisitionCost: z
    .number()
    .min(0, formValidationMessage("atLeast", { min: 0 }))
    .nullable(),
});

const discordChannelIdSchema = z.string().nullable();

export const discordSettingsDraftFormSchema = z.object({
  scanChannelId: discordChannelIdSchema,
  errorChannelId: discordChannelIdSchema,
  overrides: z.record(
    z.string(),
    z.object({
      scanChannelId: discordChannelIdSchema,
      errorChannelId: discordChannelIdSchema,
    }),
  ),
  ruleEnabled: z.record(z.string(), z.boolean()),
  discordNotifyOnScan: z.boolean(),
  discordScanUseThreads: z.boolean(),
});

export const notificationRuleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, formValidationMessage("ruleNameRequired"))
    .max(
      NOTIFICATION_RULE_NAME_MAX_LENGTH,
      formValidationMessage("nameTooLong", {
        max: NOTIFICATION_RULE_NAME_MAX_LENGTH,
      }),
    ),
  channelId: z.string().min(1, formValidationMessage("channelRequired")),
  roleId: z.string().nullable(),
  isEnabled: z.boolean(),
  rules: nonEmptyRuleGroupSchema(),
});

export const webhookFormSchema = z.object({
  url: z
    .string()
    .trim()
    .max(WEBHOOK_URL_MAX_LENGTH, formValidationMessage("webhookUrlInvalid"))
    .regex(WEBHOOK_FORM_URL_PATTERN, formValidationMessage("webhookUrlInvalid")),
  description: z
    .string()
    .trim()
    .max(
      WEBHOOK_DESCRIPTION_MAX_LENGTH,
      formValidationMessage("nameTooLong", {
        max: WEBHOOK_DESCRIPTION_MAX_LENGTH,
      }),
    ),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, formValidationMessage("eventsRequired")),
});

export const orgSettingsDraftFormSchema = z.object({
  primaryColor: z.string().nullable(),
  scannerLayout: z.enum(["horizontal", "vertical"]),
  priceSource: z.custom<PriceSource>((value) =>
    PRICE_SOURCES.includes(value as PriceSource),
  ),
  sessionWrappedEnabled: z.boolean(),
  ocrEnabled: z.boolean(),
  correctionBinPrompt: z.boolean(),
  pauseScanningOnDeploy: z.boolean(),
  leaderboardOptIn: z.boolean(),
  correctionAutoCloseSeconds: z.number().int().positive().nullable(),
  conditionMultipliers: z.custom<ConditionMultipliers>(
    (value) =>
      !!value &&
      typeof value === "object" &&
      CARD_CONDITIONS.every((condition) =>
        isConditionMultiplier((value as Record<string, unknown>)[condition]),
      ),
    formValidationMessage("conditionMultipliersInvalid"),
  ),
});

export const soundRulesDraftFormSchema = z.object({
  order: z.array(z.string()),
  enabled: z.record(z.string(), z.boolean()),
});

export const soundRuleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, formValidationMessage("ruleNameRequired"))
    .max(
      SOUND_RULE_NAME_MAX_LENGTH,
      formValidationMessage("nameTooLong", { max: SOUND_RULE_NAME_MAX_LENGTH }),
    ),
  clipGuid: z.string().min(1, formValidationMessage("clipRequired")),
  isEnabled: z.boolean(),
  rules: nonEmptyRuleGroupSchema(),
});

export const soundClipNameFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, formValidationMessage("clipNameRequired"))
    .max(
      SOUND_CLIP_NAME_MAX_LENGTH,
      formValidationMessage("nameTooLong", { max: SOUND_CLIP_NAME_MAX_LENGTH }),
    ),
});
