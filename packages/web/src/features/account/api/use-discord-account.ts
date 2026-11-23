import {
  discordAccountLinkQueryOptions,
  generateDiscordAccountLinkCode,
  unlinkDiscordAccount,
} from "@/features/account/api/discord-account";
import { toast } from "@/lib/toast";
import { STATUS_MESSAGE_SETTINGS_QUERY_KEY } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useDiscordAccount() {
  const { t } = useTranslation("account");
  const queryClient = useQueryClient();
  const queryOpts = discordAccountLinkQueryOptions();
  const { data: link, isLoading, refetch } = useQuery(queryOpts);

  const generateMutation = useMutation({
    mutationFn: generateDiscordAccountLinkCode,
    onSuccess: (result) => {
      if (!result.success) toast.error(t("discord.generateFailed"));
    },
    onError: () => toast.error(t("discord.generateFailed")),
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkDiscordAccount,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.setQueryData(queryOpts.queryKey, null);
        void queryClient.invalidateQueries({ queryKey: [STATUS_MESSAGE_SETTINGS_QUERY_KEY] });
        toast.success(t("discord.unlinked"));
      } else {
        toast.error(t("discord.unlinkFailed"));
      }
    },
    onError: () => toast.error(t("discord.unlinkFailed")),
  });

  return {
    link: link ?? null,
    isLoading,
    refresh: () => refetch(),
    generateCode: () => generateMutation.mutateAsync(),
    isGenerating: generateMutation.isPending,
    unlink: () => unlinkMutation.mutateAsync(),
    isUnlinking: unlinkMutation.isPending,
  };
}
