import { z } from "zod";
import {
  formValidationMessage,
  PLAN_FEATURE_KEYS,
  PLAN_KEYS,
  PLAN_LIMIT_KEYS,
  PLAN_LIMIT_MAX,
} from "@magic-vault/shared";

export const PLAN_PREVIEW_OFF_VALUE = "off";

export const PLAN_LIMIT_FALLBACK = 1;

export const PLAN_LIMIT_INPUT_MAX_LENGTH = String(PLAN_LIMIT_MAX).length;

const planLimitSchema = z
  .number(formValidationMessage("wholeNumber"))
  .int(formValidationMessage("wholeNumber"))
  .min(0, formValidationMessage("atLeast", { min: 0 }))
  .max(PLAN_LIMIT_MAX, formValidationMessage("atMost", { max: PLAN_LIMIT_MAX }))
  .nullable();

export const PLAN_SETTINGS_FORM_SCHEMA = z.record(
  z.enum(PLAN_KEYS),
  z.object({
    features: z.record(z.enum(PLAN_FEATURE_KEYS), z.boolean()),
    limits: z.record(z.enum(PLAN_LIMIT_KEYS), planLimitSchema),
  }),
);
