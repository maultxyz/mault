import { DEFAULT_ORG_SETTINGS, type OrgSettings } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/toast-provider";
import { orgSettingsQueryOptions, saveOrgSettings } from "@/features/org/api/org-settings";
import { useActiveOrgId } from "@/hooks/use-org";
import type { UnmatchedCardsInGridSetting } from "@/lib/interfaces/scanner";

export function useUnmatchedCardsInGrid(): UnmatchedCardsInGridSetting {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const settingsQuery = orgSettingsQueryOptions(useActiveOrgId());
  const { data, isPending } = useQuery(settingsQuery);
  const mutation = useMutation({
    mutationFn: (unmatchedCardsInGrid: boolean) => saveOrgSettings({ unmatchedCardsInGrid }),
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
      if (context?.previous) queryClient.setQueryData(settingsQuery.queryKey, context.previous);
      showToast({ message: t("unmatchedCards.showInGridFailed"), tone: "destructive" });
    },
    onSuccess: (settings) => queryClient.setQueryData(settingsQuery.queryKey, settings),
  });
  return {
    isEnabled: data?.unmatchedCardsInGrid ?? false,
    isLoading: isPending,
    setEnabled: (isEnabled) => mutation.mutate(isEnabled),
  };
}
