import {
  platformDiscordLinkedRoleQueryOptions,
  savePlatformDiscordLinkedRole,
} from "@/features/admin/api/platform-discord-linked-role";
import { EMPTY_PLATFORM_DISCORD_LINKED_ROLE_FORM } from "@/lib/constants/admin";
import { toast } from "@/lib/toast";
import {
  platformDiscordLinkedRoleSchema,
  type PlatformDiscordLinkedRoleFormValues,
} from "@/schemas/platform-discord-linked-role.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function usePlatformDiscordLinkedRoleDraft() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(platformDiscordLinkedRoleQueryOptions);

  const form = useForm<PlatformDiscordLinkedRoleFormValues>({
    resolver: zodResolver(platformDiscordLinkedRoleSchema),
    defaultValues: EMPTY_PLATFORM_DISCORD_LINKED_ROLE_FORM,
    values: data ?? undefined,
    resetOptions: { keepDirtyValues: true },
  });

  const save = async (values: PlatformDiscordLinkedRoleFormValues) => {
    try {
      const result = await savePlatformDiscordLinkedRole(values);
      if (!result.success || !result.data) {
        toast.error(
          result.message ?? t("discordChannels.linkedRole.saveFailed"),
        );
        return;
      }
      queryClient.setQueryData(
        platformDiscordLinkedRoleQueryOptions.queryKey,
        result.data,
      );
      form.reset(result.data);
      toast.success(t("discordChannels.linkedRole.saved"));
    } catch {
      toast.error(t("discordChannels.linkedRole.saveFailed"));
    }
  };

  return {
    form,
    data,
    isLoading: isPending,
    save: form.handleSubmit(save),
  };
}
