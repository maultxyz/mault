import {
  planConfigQueryOptions,
  savePlanConfig,
} from "@/features/admin/api/plans";
import { billingKeys } from "@/features/billing/api/billing";
import { toast } from "@/lib/toast";
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

  const save = async (values: PlanSettingsFormValues) => {
    try {
      const result = await savePlanConfig(values);
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("plans.saveFailed"));
        return;
      }
      queryClient.setQueryData(planConfigQueryOptions.queryKey, result.data);
      form.reset(result.data.config);
      void queryClient.invalidateQueries({ queryKey: billingKeys.root() });
      toast.success(t("plans.saved"));
    } catch {
      toast.error(t("plans.saveFailed"));
    }
  };

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
