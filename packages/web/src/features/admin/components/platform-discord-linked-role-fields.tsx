import { Label } from "@/components/ui/label";
import { platformDiscordGuildQueryOptions } from "@/features/admin/api/platform-discord-channels";
import { DiscordGuildSelect } from "@/features/admin/components/discord-guild-select";
import { DiscordRoleSelect } from "@/features/integrations/components/discord-role-select";
import type { PlatformDiscordLinkedRoleFieldsProps } from "@/lib/interfaces/admin";
import { useQuery } from "@tanstack/react-query";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function PlatformDiscordLinkedRoleFields({
  form,
  guilds,
  botReachable,
}: PlatformDiscordLinkedRoleFieldsProps) {
  const { t } = useTranslation("admin");
  const guildId = useWatch({ control: form.control, name: "guildId" });
  const guildQuery = useQuery(platformDiscordGuildQueryOptions(guildId));
  const guild = guildQuery.data ?? null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label>{t("discordChannels.server")}</Label>
        <Controller
          control={form.control}
          name="guildId"
          render={({ field }) => (
            <DiscordGuildSelect
              value={field.value}
              guilds={guilds}
              emptyLabel={t("discordChannels.noServer")}
              disabled={!botReachable}
              onChange={(next) => {
                field.onChange(next);
                form.setValue("roleId", null, { shouldDirty: true });
              }}
            />
          )}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("discordChannels.linkedRole.role")}</Label>
        <Controller
          control={form.control}
          name="roleId"
          render={({ field }) => (
            <DiscordRoleSelect
              value={field.value}
              roles={guild?.roles ?? []}
              isSelectable={(role) => role.canAssign}
              disabled={!guild || guildQuery.isFetching}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </div>
  );
}
