import {
  generateDiscordLinkCode,
  orgSettingsQueryOptions,
  unlinkDiscord,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function useDiscordBotSettings() {
  const { t } = useTranslation("companies");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);
  const { data, isLoading } = useQuery(queryOpts);

  const generateMutation = useMutation({
    mutationFn: generateDiscordLinkCode,
    onSuccess: (result) => {
      if (!result.success) toast.error(t("discordBot.generateError"));
    },
    onError: () => toast.error(t("discordBot.generateError")),
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkDiscord,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.setQueryData(queryOpts.queryKey, (old) =>
          old
            ? { ...old, discordGuildId: null, discordNotifyOnScan: false }
            : old,
        );
        toast.success(t("discordBot.unlinkSuccess"));
      } else {
        toast.error(t("discordBot.unlinkError"));
      }
    },
    onError: () => toast.error(t("discordBot.unlinkError")),
  });

  return {
    isLinked: !!data?.discordGuildId,
    isLoading,
    generateCode: () => generateMutation.mutateAsync(),
    isGenerating: generateMutation.isPending,
    unlink: () => unlinkMutation.mutateAsync(),
    isUnlinking: unlinkMutation.isPending,
  };
}
