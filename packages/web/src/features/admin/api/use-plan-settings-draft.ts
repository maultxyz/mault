import {
  planConfigQueryOptions,
  savePlanConfig,
} from "@/features/admin/api/plans";
import { billingKeys } from "@/features/billing/api/billing";
import { requestWithToasts } from "@/lib/request-with-toasts";
import {
  createPlanSettingsSchema,
  type PlanSettingsFormValues,
} from "@/schemas/plan-settings.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function usePlanSettingsDraft() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(planConfigQueryOptions);
  const schema = useMemo(() => createPlanSettingsSchema(t), [t]);

  const form = useForm<PlanSettingsFormValues>({
    resolver: zodResolver(schema),
    values: data?.config,
    resetOptions: { keepDirtyValues: true },
  });

  const save = (values: PlanSettingsFormValues) =>
    requestWithToasts(() => savePlanConfig(values), {
      successMessage: t("plans.saved"),
      failureMessage: t("plans.saveFailed"),
      onSuccess: (saved) => {
        queryClient.setQueryData(planConfigQueryOptions.queryKey, saved);
        form.reset(saved.config);
        void queryClient.invalidateQueries({ queryKey: billingKeys.root() });
      },
    });

  const restoreDefaults = () => {
    if (!data) return;
    form.reset(data.defaults, { keepDefaultValues: true });
  };

  return {
    form,
    data,
    isLoading: isPending,
    save: form.handleSubmit(save),
    restoreDefaults,
  };
}
