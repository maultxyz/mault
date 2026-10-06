import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";
import { sendTestNotification } from "./notification-settings";
import type { NotificationTestType } from "@/lib/interfaces/notifications";

export function useNotificationSettings() {
  const { t } = useTranslation("notifications");
  const { activeOrg } = useOrg();
  const { data, isLoading } = useQuery(orgSettingsQueryOptions(activeOrg?.id));

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
    isLoading,
    isLinked: !!data?.discordGuildId,
    sendTest: testMutation.mutate,
    isTesting: testMutation.isPending,
    testingType: testMutation.variables,
  };
}
