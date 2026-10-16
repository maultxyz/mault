import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { DEFAULT_ORG_SETTINGS, type OrgSettings } from "@magic-vault/shared";
import { orgSettingsQueryOptions, saveOrgSettings } from "@/features/org/api/org-settings";
import { orgSettingsDraftSchema } from "@/features/settings/lib/org-settings-schema";
import { useActiveOrgId } from "@/hooks/use-org";
import type { OrgSettingsDraftValues } from "@/lib/interfaces/forms";
import type { OrgSettingsDraft } from "@/lib/interfaces/settings";

function toDraft(settings: OrgSettings): OrgSettingsDraftValues {
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

export function useOrgSettingsDraft(): OrgSettingsDraft {
  const queryClient = useQueryClient();
  const options = orgSettingsQueryOptions(useActiveOrgId());
  const { data, isLoading } = useQuery(options);
  const values = useMemo(() => toDraft(data ?? DEFAULT_ORG_SETTINGS), [data]);
  const [saveError, setSaveError] = useState(false);
  const form = useForm<OrgSettingsDraftValues>({
    resolver: zodResolver(orgSettingsDraftSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });

  const submit = async (draft: OrgSettingsDraftValues) => {
    const patch = Object.fromEntries(
      Object.entries(draft).filter(
        ([key, value]) => JSON.stringify(values[key as keyof OrgSettingsDraftValues]) !== JSON.stringify(value),
      ),
    ) as Partial<OrgSettingsDraftValues>;
    if (Object.keys(patch).length === 0) {
      form.reset(values);
      return;
    }
    setSaveError(false);
    try {
      const saved = await saveOrgSettings(patch);
      queryClient.setQueryData(options.queryKey, saved);
      form.reset(toDraft(saved));
      if ("priceSource" in patch || "conditionMultipliers" in patch) {
        void queryClient.invalidateQueries({ queryKey: ["collection-cards"] });
        void queryClient.invalidateQueries({ queryKey: ["org-overview"] });
        void queryClient.invalidateQueries({ queryKey: ["stats"] });
      }
    } catch {
      setSaveError(true);
    }
  };

  return {
    control: form.control,
    savedPrimaryColor: values.primaryColor,
    isLoading,
    isDirty: form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    saveError,
    save: () => void form.handleSubmit(submit)(),
    discard: () => form.reset(values),
  };
}
