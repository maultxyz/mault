import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { PLAN_KEYS } from "@magic-vault/shared";
import { planConfigQueryOptions, savePlanConfig } from "@/features/admin/api/plans-config";
import { PLAN_SETTINGS_FORM_SCHEMA } from "@/lib/constants/admin-plans";
import type { PlanSettingsDraft, PlanSettingsDraftOptions, PlanSettingsFormValues } from "@/lib/interfaces/admin-plans";

export function usePlanSettingsDraft({ onValidationFailedForPlan }: PlanSettingsDraftOptions): PlanSettingsDraft {
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery(planConfigQueryOptions);
  const [saveError, setSaveError] = useState(false);
  const form = useForm<PlanSettingsFormValues>({
    resolver: zodResolver(PLAN_SETTINGS_FORM_SCHEMA),
    values: data?.config,
    resetOptions: { keepDirtyValues: true },
  });

  const submit = async (values: PlanSettingsFormValues) => {
    setSaveError(false);
    try {
      const saved = await savePlanConfig(values);
      queryClient.setQueryData(planConfigQueryOptions.queryKey, saved);
      form.reset(saved.config);
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
    } catch {
      setSaveError(true);
    }
  };

  const revealFirstInvalidPlan = (errors: FieldErrors<PlanSettingsFormValues>) => {
    const firstInvalidPlan = PLAN_KEYS.find((plan) => errors[plan]);
    if (firstInvalidPlan) onValidationFailedForPlan(firstInvalidPlan);
  };

  return {
    control: form.control,
    data,
    isLoading: isPending,
    isLoadError: isError,
    isDirty: form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    saveError,
    save: () => void form.handleSubmit(submit, revealFirstInvalidPlan)(),
    discard: () => {
      setSaveError(false);
      form.reset(data?.config);
    },
    restoreDefaults: () => {
      if (data) form.reset(data.defaults, { keepDefaultValues: true });
    },
  };
}
