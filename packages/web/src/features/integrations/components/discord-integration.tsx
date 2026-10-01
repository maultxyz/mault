import { Badge } from "@/components/ui/badge";
import { useCollections } from "@/features/collections/api/use-collections";
import { useDiscordBotSettings } from "@/features/companies/api/use-discord-bot";
import { useOrg } from "@/features/companies/api/use-organization";
import { DiscordBotSettings } from "@/features/companies/components/discord-bot-settings";
import { discordIntegrationQueryOptions } from "@/features/integrations/api/integrations";
import { DiscordChannelList } from "@/features/integrations/components/discord-channel-list";
import { NotificationRuleList } from "@/features/integrations/components/notification-rule-list";
import { DiscordNotificationSettings } from "@/features/notifications/components/discord-notification-settings";
import { IconAlertTriangle, IconBrandDiscord } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function DiscordIntegration() {
  const { t } = useTranslation("integrations");
  const { activeOrg } = useOrg();
  const { isLinked } = useDiscordBotSettings();
  const { activeCollection } = useCollections();
  const game = activeCollection?.game;
  const { data: integration } = useQuery(
    discordIntegrationQueryOptions(activeOrg?.id, isLinked),
  );
  const guild = integration?.guild ?? null;

  const warning = !integration?.linked
    ? null
    : !integration.botReachable
      ? t("discord.botUnreachable")
      : !guild
        ? t("discord.botNotInServer")
        : null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#5865F2] text-white">
          <IconBrandDiscord size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-sm font-semibold">
            {t("discord.heading")}
          </h2>
          <p className="truncate text-sm text-foreground/70">
            {guild
              ? t("discord.connectedTo", { server: guild.name })
              : t("discord.description")}
          </p>
        </div>
        <Badge variant={isLinked ? "secondary" : "outline"}>
          {isLinked ? t("discord.statusLinked") : t("discord.statusNotLinked")}
        </Badge>
      </div>

      <DiscordBotSettings />

      {warning && (
        <p className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          <IconAlertTriangle size={16} className="shrink-0" />
          {warning}
        </p>
      )}

      {isLinked && integration && (
        <>
          <DiscordChannelList integration={integration} />
          <DiscordNotificationSettings />
          {game ? (
            <NotificationRuleList
              gameGuid={game.guid}
              channels={guild?.channels ?? []}
            />
          ) : (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {t("rules.needsGame")}
            </p>
          )}
        </>
      )}
    </section>
  );
}
