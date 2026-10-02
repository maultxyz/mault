import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import {
  orgSettingsQueryOptions,
  saveOrgSettings,
  type OrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { DEFAULT_ORG_SETTINGS } from "@/lib/constants/org-settings";
import { toast } from "@/lib/toast";
import {
  orgSettingsDraftSchema,
  type OrgSettingsDraftValues,
} from "@/schemas/org-settings-draft.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

function toOrgSettingsDraft(settings: OrgSettings): OrgSettingsDraftValues {
  return {
    primaryColor: settings.primaryColor,
    scannerLayout: settings.scannerLayout,
    priceSource: settings.priceSource,
    sessionWrappedEnabled: settings.sessionWrappedEnabled,
    ocrEnabled: settings.ocrEnabled,
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

  const form = useForm<OrgSettingsDraftValues>({
    resolver: zodResolver(orgSettingsDraftSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });

  const save = async (draft: OrgSettingsDraftValues) => {
    const patch = Object.fromEntries(
      Object.entries(draft).filter(
        ([key, value]) => values[key as keyof OrgSettingsDraftValues] !== value,
      ),
    ) as Partial<OrgSettingsDraftValues>;
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
      if ("priceSource" in patch) {
        void queryClient.invalidateQueries({
          queryKey: collectionCardsKeys.root(),
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
    discard: () => form.reset(values),
  };
}
