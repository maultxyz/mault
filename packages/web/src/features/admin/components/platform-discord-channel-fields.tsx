import { Label } from "@/components/ui/label";
import { platformDiscordGuildQueryOptions } from "@/features/admin/api/platform-discord-channels";
import { DiscordGuildSelect } from "@/features/admin/components/discord-guild-select";
import { DiscordChannelSelect } from "@/features/integrations/components/discord-channel-select";
import type { PlatformDiscordChannelFieldsProps } from "@/lib/interfaces/admin";
import { useQuery } from "@tanstack/react-query";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function PlatformDiscordChannelFields({
  form,
  channelKey,
  guilds,
  botReachable,
}: PlatformDiscordChannelFieldsProps) {
  const { t } = useTranslation("admin");
  const guildId = useWatch({
    control: form.control,
    name: `${channelKey}.guildId`,
  });
  const guildQuery = useQuery(platformDiscordGuildQueryOptions(guildId));
  const guild = guildQuery.data ?? null;
  const isGuildLoading = guildQuery.isFetching;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label>{t("discordChannels.server")}</Label>
        <Controller
          control={form.control}
          name={`${channelKey}.guildId`}
          render={({ field }) => (
            <DiscordGuildSelect
              value={field.value}
              guilds={guilds}
              emptyLabel={t("discordChannels.noServer")}
              disabled={!botReachable}
              onChange={(next) => {
                field.onChange(next);
                form.setValue(`${channelKey}.channelId`, null, {
                  shouldDirty: true,
                });
              }}
            />
          )}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("discordChannels.channel")}</Label>
        <Controller
          control={form.control}
          name={`${channelKey}.channelId`}
          render={({ field }) => (
            <DiscordChannelSelect
              value={field.value}
              channels={guild?.channels ?? []}
              emptyLabel={
                isGuildLoading
                  ? t("discordChannels.loadingChannels")
                  : t("discordChannels.noChannel")
              }
              disabled={!guild || isGuildLoading}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </div>
  );
}
