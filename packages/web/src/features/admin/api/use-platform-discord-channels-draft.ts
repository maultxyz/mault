import {
  platformDiscordChannelsQueryOptions,
  savePlatformDiscordChannels,
} from "@/features/admin/api/platform-discord-channels";
import { platformStatsQueryOptions } from "@/features/admin/api/platform-stats";
import { EMPTY_PLATFORM_DISCORD_CHANNELS_FORM } from "@/lib/constants/admin";
import { toast } from "@/lib/toast";
import {
  platformDiscordChannelsSchema,
  type PlatformDiscordChannelsFormValues,
} from "@/schemas/platform-discord-channels.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function usePlatformDiscordChannelsDraft() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(platformDiscordChannelsQueryOptions);

  const form = useForm<PlatformDiscordChannelsFormValues>({
    resolver: zodResolver(platformDiscordChannelsSchema),
    defaultValues: EMPTY_PLATFORM_DISCORD_CHANNELS_FORM,
    values: data?.settings,
    resetOptions: { keepDirtyValues: true },
  });

  const save = async (values: PlatformDiscordChannelsFormValues) => {
    try {
      const result = await savePlatformDiscordChannels(values);
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("discordChannels.saveFailed"));
        return;
      }
      queryClient.setQueryData(
        platformDiscordChannelsQueryOptions.queryKey,
        result.data,
      );
      form.reset(result.data.settings);
      void queryClient.invalidateQueries({
        queryKey: platformStatsQueryOptions.queryKey,
      });
      toast.success(t("discordChannels.saved"));
    } catch {
      toast.error(t("discordChannels.saveFailed"));
    }
  };

  return {
    form,
    data,
    isLoading: isPending,
    save: form.handleSubmit(save),
  };
}
