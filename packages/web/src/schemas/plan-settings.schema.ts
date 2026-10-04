import {
  PLAN_FEATURE_KEYS,
  PLAN_KEYS,
  PLAN_LIMIT_KEYS,
  PLAN_LIMIT_MAX,
} from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { z } from "zod";

export function createPlanSettingsSchema(t: TFunction<"admin">) {
  const limit = z
    .number(t("plans.validation.number"))
    .int(t("plans.validation.number"))
    .min(0, t("plans.validation.number"))
    .max(PLAN_LIMIT_MAX, t("plans.validation.max", { max: PLAN_LIMIT_MAX }))
    .nullable();
  const settings = z.object({
    features: z.record(z.enum(PLAN_FEATURE_KEYS), z.boolean()),
    limits: z.record(z.enum(PLAN_LIMIT_KEYS), limit),
  });
  return z.record(z.enum(PLAN_KEYS), settings);
}

export type PlanSettingsFormValues = z.infer<
  ReturnType<typeof createPlanSettingsSchema>
>;
