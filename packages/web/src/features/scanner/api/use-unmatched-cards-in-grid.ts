import {
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import type { UnmatchedCardsInGridSetting } from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import { DEFAULT_ORG_SETTINGS, type OrgSettings } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useUnmatchedCardsInGrid(): UnmatchedCardsInGridSetting {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const settingsQuery = orgSettingsQueryOptions(activeOrg?.id);
  const { data, isPending } = useQuery(settingsQuery);
  const mutation = useMutation({
    mutationFn: async (unmatchedCardsInGrid: boolean) => {
      const result = await saveOrgSettings({ unmatchedCardsInGrid });
      if (!result.success || !result.data) throw new Error("save failed");
      return result.data;
    },
    onMutate: async (unmatchedCardsInGrid) => {
      await queryClient.cancelQueries({ queryKey: settingsQuery.queryKey });
      const previous = queryClient.getQueryData<OrgSettings>(settingsQuery.queryKey);
      queryClient.setQueryData<OrgSettings>(settingsQuery.queryKey, (old) => ({
        ...(old ?? DEFAULT_ORG_SETTINGS),
        unmatchedCardsInGrid,
      }));
      return { previous };
    },
    onError: (_error, _value, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsQuery.queryKey, context.previous);
      }
      toast.error(t("unmatchedCardsPanel.showInGridFailed"));
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsQuery.queryKey, settings);
    },
  });
  return {
    isEnabled: data?.unmatchedCardsInGrid ?? false,
    isLoading: isPending,
    setEnabled: (isEnabled) => mutation.mutate(isEnabled),
  };
}
