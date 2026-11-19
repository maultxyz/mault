import type { Control } from "react-hook-form";
import type { z } from "zod";
import type { AdminPlanConfigResponse, PlanKey, PlanLimitKey } from "@magic-vault/shared";
import type { PLAN_SETTINGS_FORM_SCHEMA } from "@/lib/constants/admin-plans";

export type PlanSettingsFormValues = z.infer<typeof PLAN_SETTINGS_FORM_SCHEMA>;

export interface PlanPreviewSelection {
  userId: string;
  plan: PlanKey;
}

export interface PlanSettingsDraftOptions {
  onValidationFailedForPlan: (plan: PlanKey) => void;
}

export interface PlanSettingsDraft {
  control: Control<PlanSettingsFormValues>;
  data: AdminPlanConfigResponse | undefined;
  isLoading: boolean;
  isLoadError: boolean;
  isDirty: boolean;
  isSaving: boolean;
  saveError: boolean;
  save: () => void;
  discard: () => void;
  restoreDefaults: () => void;
}

export interface PlansLimitRowProps {
  plan: PlanKey;
  limit: PlanLimitKey;
  control: Control<PlanSettingsFormValues>;
  fallbackLimit: number;
  disabled: boolean;
}

export interface PlansFeatureRowsProps {
  plan: PlanKey;
  control: Control<PlanSettingsFormValues>;
  disabled: boolean;
}
