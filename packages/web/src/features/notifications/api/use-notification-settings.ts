import {
  DEFAULT_ORG_SETTINGS,
  orgSettingsQueryOptions,
  saveOrgSettings,
  type OrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { NotificationTestType } from "./notification-settings";
import { sendTestNotification } from "./notification-settings";

type NotificationSettingsPatch = Pick<OrgSettings, "discordNotifyOnScan">;

export function useNotificationSettings() {
  const { t } = useTranslation("notifications");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);

  const { data, isLoading } = useQuery(queryOpts);
  const settings = {
    discordNotifyOnScan: data?.discordNotifyOnScan ?? false,
  };

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<NotificationSettingsPatch>) =>
      saveOrgSettings(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryOpts.queryKey });
      const previous = queryClient.getQueryData(queryOpts.queryKey);
      queryClient.setQueryData(
        queryOpts.queryKey,
        (old: typeof data): typeof data => ({
          ...(old ?? DEFAULT_ORG_SETTINGS),
          ...patch,
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(queryOpts.queryKey, ctx.previous);
      toast.error(t("toasts.saveError"));
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(queryOpts.queryKey, result.data);
        toast.success(t("toasts.saveSuccess"));
      } else {
        toast.error(t("toasts.saveError"));
      }
    },
  });

  const testMutation = useMutation({
    mutationFn: (type: NotificationTestType) => sendTestNotification(type),
    onSuccess: (outcome) => {
      if (outcome === "sent") toast.success(t("toasts.testSuccess"));
      else if (outcome === "no_channel") {
        toast.error(t("toasts.testNoChannel.title"), {
          description: t("toasts.testNoChannel.description"),
        });
      } else toast.error(t("toasts.testError"));
    },
    onError: () => toast.error(t("toasts.testError")),
  });

  return {
    settings,
    isLoading,
    isLinked: !!data?.discordGuildId,
    save: (patch: Partial<NotificationSettingsPatch>) =>
      saveMutation.mutateAsync(patch),
    isSaving: saveMutation.isPending,
    sendTest: testMutation.mutate,
    isTesting: testMutation.isPending,
    testingType: testMutation.variables,
  };
}
