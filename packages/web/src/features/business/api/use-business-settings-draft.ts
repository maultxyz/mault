import {
  businessKeys,
  saveBusinessSettings,
} from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import { toast } from "@/lib/toast";
import {
  businessSettingsDraftSchema,
  type BusinessSettingsDraftValues,
} from "@/schemas/business.schema";
import {
  DEFAULT_BUSINESS_PERMISSIONS,
  DEFAULT_BUYLIST_CONFIG,
  sortBuylistTiers,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function useBusinessSettingsDraft() {
  const { t } = useTranslation("business");
  const queryClient = useQueryClient();
  const { orgId, settings, access, isLoading } = useBusinessAccess();
  const values = useMemo<BusinessSettingsDraftValues>(
    () => ({
      buylist: settings?.buylist ?? DEFAULT_BUYLIST_CONFIG,
      permissions: settings?.permissions ?? DEFAULT_BUSINESS_PERMISSIONS,
    }),
    [settings],
  );

  const form = useForm<BusinessSettingsDraftValues>({
    resolver: zodResolver(businessSettingsDraftSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });

  const save = async (draft: BusinessSettingsDraftValues) => {
    try {
      const result = await saveBusinessSettings({
        buylist: { ...draft.buylist, tiers: sortBuylistTiers(draft.buylist.tiers) },
        permissions: draft.permissions,
      });
      if (!result.success || !result.data) {
        toast.error(result.message || t("settings.saveFailed"));
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: businessKeys.settings(orgId),
      });
      form.reset({ buylist: result.data.buylist, permissions: result.data.permissions });
      toast.success(t("settings.saved"));
    } catch {
      toast.error(t("settings.saveFailed"));
    }
  };

  return {
    form,
    control: form.control,
    canManage: access?.canManageSettings ?? false,
    isLoading,
    isDirty: form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    save: () => void form.handleSubmit(save)(),
    discard: () => form.reset(values, DISCARD_RESET_OPTIONS),
  };
}
