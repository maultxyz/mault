import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import {
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { leaderboardKeys } from "@/features/stats/api/leaderboard";
import { toast } from "@/lib/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  type OrgSettings,
  DEFAULT_ORG_SETTINGS,
  orgSettingsDraftFormSchema,
  type OrgSettingsDraftFormValues,
} from "@magic-vault/shared";

function toOrgSettingsDraft(settings: OrgSettings): OrgSettingsDraftFormValues {
  return {
    primaryColor: settings.primaryColor,
    scannerLayout: settings.scannerLayout,
    priceSource: settings.priceSource,
    sessionWrappedEnabled: settings.sessionWrappedEnabled,
    ocrEnabled: settings.ocrEnabled,
    correctionBinPrompt: settings.correctionBinPrompt,
    pauseScanningOnDeploy: settings.pauseScanningOnDeploy,
    leaderboardOptIn: settings.leaderboardOptIn,
    correctionAutoCloseSeconds: settings.correctionAutoCloseSeconds,
    conditionMultipliers: settings.conditionMultipliers,
  };
}

export function useOrgSettingsDraft() {
  const { t } = useTranslation("settings");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);
  const { data, isLoading } = useQuery(queryOpts);
  const values = useMemo(
    () => toOrgSettingsDraft(data ?? DEFAULT_ORG_SETTINGS),
    [data],
  );

  const form = useForm<OrgSettingsDraftFormValues>({
    resolver: zodResolver(orgSettingsDraftFormSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });

  const save = async (draft: OrgSettingsDraftFormValues) => {
    const patch = Object.fromEntries(
      Object.entries(draft).filter(
        ([key, value]) =>
          JSON.stringify(values[key as keyof OrgSettingsDraftFormValues]) !==
          JSON.stringify(value),
      ),
    ) as Partial<OrgSettingsDraftFormValues>;
    if (!Object.keys(patch).length) {
      form.reset(values);
      return;
    }

    try {
      const result = await saveOrgSettings(patch);
      if (!result.success || !result.data) {
        toast.error(t("draft.saveFailed"));
        return;
      }
      queryClient.setQueryData(queryOpts.queryKey, result.data);
      form.reset(toOrgSettingsDraft(result.data));
      if ("priceSource" in patch || "conditionMultipliers" in patch) {
        void queryClient.invalidateQueries({
          queryKey: collectionCardsKeys.root(),
        });
      }
      if ("leaderboardOptIn" in patch) {
        void queryClient.invalidateQueries({
          queryKey: leaderboardKeys.root(),
        });
      }
      toast.success(t("draft.saved"));
    } catch {
      toast.error(t("draft.saveFailed"));
    }
  };

  return {
    control: form.control,
    savedPrimaryColor: values.primaryColor,
    isLoading,
    isDirty: form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    save: () => void form.handleSubmit(save)(),
    discard: () => form.reset(values, DISCARD_RESET_OPTIONS),
  };
}
