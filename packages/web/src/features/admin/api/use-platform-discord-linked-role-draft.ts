import {
  platformDiscordLinkedRoleQueryOptions,
  savePlatformDiscordLinkedRole,
} from "@/features/admin/api/platform-discord-linked-role";
import { EMPTY_PLATFORM_DISCORD_LINKED_ROLE_FORM } from "@/lib/constants/admin";
import { requestWithToasts } from "@/lib/request-with-toasts";
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

  const save = (values: PlatformDiscordLinkedRoleFormValues) =>
    requestWithToasts(() => savePlatformDiscordLinkedRole(values), {
      successMessage: t("discordChannels.linkedRole.saved"),
      failureMessage: t("discordChannels.linkedRole.saveFailed"),
      onSuccess: (saved) => {
        queryClient.setQueryData(
          platformDiscordLinkedRoleQueryOptions.queryKey,
          saved,
        );
        form.reset(saved);
      },
    });

  return {
    form,
    data,
    isLoading: isPending,
    save: form.handleSubmit(save),
  };
}
