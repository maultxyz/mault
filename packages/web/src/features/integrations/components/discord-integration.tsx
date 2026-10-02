import { SaveBar } from "@/components/save-bar";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useCollections } from "@/features/collections/api/use-collections";
import { useDiscordBotSettings } from "@/features/companies/api/use-discord-bot";
import { useOrg } from "@/features/companies/api/use-organization";
import { DiscordBotSettings } from "@/features/companies/components/discord-bot-settings";
import { discordIntegrationQueryOptions } from "@/features/integrations/api/integrations";
import { useDiscordSettingsDraft } from "@/features/integrations/api/use-discord-settings-draft";
import { DiscordChannelSettings } from "@/features/integrations/components/discord-channel-settings";
import { DiscordCollectionOverrides } from "@/features/integrations/components/discord-collection-overrides";
import { NotificationRuleList } from "@/features/integrations/components/notification-rule-list";
import { DiscordNotificationSettings } from "@/features/notifications/components/discord-notification-settings";
import { IconAlertTriangle, IconBrandDiscord } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { FormProvider } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function DiscordIntegration() {
  const { t } = useTranslation("integrations");
  const { t: tCompanies } = useTranslation("companies");
  const { activeOrg } = useOrg();
  const { isLinked } = useDiscordBotSettings();
  const { activeCollection } = useCollections();
  const game = activeCollection?.game;
  const { data: integration } = useQuery(
    discordIntegrationQueryOptions(activeOrg?.id, isLinked),
  );
  const guild = integration?.guild ?? null;
  const draft = useDiscordSettingsDraft(integration, game?.guid);

  const warning = !integration?.linked
    ? null
    : !integration.botReachable
      ? t("discord.botUnreachable")
      : !guild
        ? t("discord.botNotInServer")
        : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#5865F2] text-white">
          <IconBrandDiscord size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-semibold">
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

      <SettingsSections>
        <SettingsSection
          heading={t("discord.connection")}
          description={tCompanies("discordBot.description")}
        >
          <DiscordBotSettings />
          {warning && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <IconAlertTriangle size={16} className="shrink-0" />
              {warning}
            </p>
          )}
        </SettingsSection>

        {isLinked && integration && (
          <FormProvider {...draft.form}>
            <DiscordChannelSettings integration={integration} />
            <DiscordCollectionOverrides integration={integration} />
            {game ? (
              <NotificationRuleList
                gameGuid={game.guid}
                channels={guild?.channels ?? []}
                roles={guild?.roles ?? []}
              />
            ) : (
              <SettingsSection
                heading={t("rules.heading")}
                description={t("rules.needsGame")}
              />
            )}
            <SettingsSection
              heading={t("notifications.heading")}
              description={t("notifications.description")}
            >
              <DiscordNotificationSettings />
            </SettingsSection>
            <SaveBar
              show={draft.isDirty}
              isSaving={draft.isSaving}
              onSave={draft.save}
              onDiscard={draft.discard}
            />
          </FormProvider>
        )}
      </SettingsSections>
      <UnsavedChangesGuard isDirty={draft.isDirty} onDiscard={draft.discard} />
    </div>
  );
}
