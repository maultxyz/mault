import { useOrg } from "@/features/companies/api/use-organization";
import { setDiscordChannel } from "@/features/integrations/api/integrations";
import { toast } from "@/lib/toast";
import type { DiscordChannelInput } from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useSaveDiscordChannels() {
  const { t } = useTranslation("integrations");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DiscordChannelInput) => setDiscordChannel(input),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message || t("channelSettings.saveFailed"));
        return;
      }
      toast.success(t("channelSettings.saved"));
    },
    onError: () => toast.error(t("channelSettings.saveFailed")),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["discord-integration", activeOrg?.id],
      }),
  });
}
