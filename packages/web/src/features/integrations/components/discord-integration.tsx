import { Callout } from "@/components/callout";
import { ListSkeleton } from "@/components/list-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
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
  const {
    data: integration,
    isLoading: isIntegrationLoading,
    isError: isIntegrationError,
    refetch: refetchIntegration,
  } = useQuery(discordIntegrationQueryOptions(activeOrg?.id, isLinked));
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
    <div className="flex flex-col gap-6 md:gap-2">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#5865F2] text-white">
          <IconBrandDiscord size={24} />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm text-foreground/70">
          {guild ? t("discord.connectedTo", { server: guild.name }) : null}
        </p>
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
            <Callout variant="warning" icon={IconAlertTriangle}>
              {warning}
            </Callout>
          )}
        </SettingsSection>

        {isLinked && !integration && isIntegrationError && (
          <LoadErrorCallout
            message={t("discord.loadFailed")}
            onRetry={() => void refetchIntegration()}
          />
        )}
        {isLinked && !integration && isIntegrationLoading && (
          <ListSkeleton rows={4} />
        )}

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
