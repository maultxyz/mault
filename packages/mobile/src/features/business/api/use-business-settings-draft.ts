import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  businessSettingsDraftSchema,
  type BusinessSettingsDraftValues,
  type BusinessSettingsResponse,
  DEFAULT_BUSINESS_PERMISSIONS,
  DEFAULT_BUYLIST_CONFIG,
  sortBuylistTiers,
} from "@magic-vault/shared";
import { businessSettingsQueryOptions, saveBusinessSettings } from "@/features/business/api/business-access";
import { useActiveOrgId } from "@/hooks/use-org";
import type { BusinessSettingsDraft } from "@/lib/interfaces/business";

export function useBusinessSettingsDraft(): BusinessSettingsDraft {
  const queryClient = useQueryClient();
  const options = businessSettingsQueryOptions(useActiveOrgId());
  const { data, isError, isFetching, refetch } = useQuery(options);
  const isLoadError = isError && !data;
  const values = useMemo<BusinessSettingsDraftValues>(
    () => ({
      buylist: data?.settings.buylist ?? DEFAULT_BUYLIST_CONFIG,
      permissions: data?.settings.permissions ?? DEFAULT_BUSINESS_PERMISSIONS,
    }),
    [data],
  );
  const [saveError, setSaveError] = useState(false);
  const form = useForm<BusinessSettingsDraftValues>({
    resolver: zodResolver(businessSettingsDraftSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });

  const submit = async (draft: BusinessSettingsDraftValues) => {
    setSaveError(false);
    try {
      const saved = await saveBusinessSettings({
        buylist: { ...draft.buylist, tiers: sortBuylistTiers(draft.buylist.tiers) },
        permissions: draft.permissions,
      });
      queryClient.setQueryData(options.queryKey, (current: BusinessSettingsResponse | undefined) =>
        current ? { ...current, settings: saved } : current,
      );
      form.reset({ buylist: saved.buylist, permissions: saved.permissions });
    } catch {
      setSaveError(true);
    }
  };

  return {
    control: form.control,
    canManage: !!data?.access.canManageSettings,
    isLoading: !data && !isLoadError,
    isLoadError,
    isRetryingLoad: isLoadError && isFetching,
    retryLoad: () => void refetch(),
    isDirty: !!data && form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    saveError,
    save: () => {
      if (data) void form.handleSubmit(submit)();
    },
    discard: () => form.reset(values),
  };
}
