import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import { Callout } from "@/components/callout";
import { ListSkeleton } from "@/components/list-skeleton";
import { SaveBar } from "@/components/save-bar";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { usePlatformDiscordChannelsDraft } from "@/features/admin/api/use-platform-discord-channels-draft";
import { usePlatformStatsDraft } from "@/features/admin/api/use-platform-stats-draft";
import { AdminScriptCommand } from "@/features/admin/components/admin-script-command";
import { PlatformDiscordChannelFields } from "@/features/admin/components/platform-discord-channel-fields";
import { PlatformStatsFields } from "@/features/admin/components/platform-stats-fields";
import {
  PLATFORM_STATS_SCRIPT_COMMAND,
  PRICE_SYNC_SCRIPT_COMMAND,
} from "@/lib/constants/admin";
import { DONATE_URL } from "@/lib/constants/links";
import type { PlatformDiscordChannelKey } from "@magic-vault/shared";
import { IconExternalLink, IconLoader2, IconSend } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PlatformDiscordChannelsManager() {
  const { t, i18n } = useTranslation("admin");
  const channels = usePlatformDiscordChannelsDraft();
  const stats = usePlatformStatsDraft();
  const channelsDirty = channels.form.formState.isDirty;
  const statsDirty = stats.form.formState.isDirty;
  const isDirty = channelsDirty || statsDirty;
  const isSaving =
    channels.form.formState.isSubmitting || stats.form.formState.isSubmitting;

  if (channels.isLoading || !channels.data || stats.isLoading || !stats.data) {
    return (
      <SettingsSection heading={t("discordChannels.channels.stats.heading")}>
        <ListSkeleton />
      </SettingsSection>
    );
  }

  const canPost =
    !isDirty &&
    stats.data.channelConfigured &&
    stats.data.settings.stats.length > 0;

  const saveAll = async () => {
    if (channelsDirty) await channels.save();
    if (statsDirty) await stats.save();
  };

  const discardAll = () => {
    channels.form.reset(undefined, DISCARD_RESET_OPTIONS);
    stats.form.reset(undefined, DISCARD_RESET_OPTIONS);
  };

  const { guilds, botReachable } = channels.data;

  const channelFields = (key: PlatformDiscordChannelKey) => (
    <PlatformDiscordChannelFields
      form={channels.form}
      channelKey={key}
      guilds={guilds}
      botReachable={botReachable}
    />
  );

  return (
    <>
      {!botReachable && (
        <Callout variant="warning">{t("discordChannels.botUnreachable")}</Callout>
      )}

      <SettingsSection
        heading={t("discordChannels.channels.stats.heading")}
        description={t("discordChannels.channels.stats.description")}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPost || stats.isPosting}
            onClick={stats.postNow}
          >
            {stats.isPosting ? (
              <IconLoader2 className="animate-spin" />
            ) : (
              <IconSend />
            )}
            {t("platformStats.postNow")}
          </Button>
        }
      >
        {channelFields("stats")}
        <PlatformStatsFields form={stats.form} />
        <AdminScriptCommand
          command={PLATFORM_STATS_SCRIPT_COMMAND}
          description={t("platformStats.scheduleDescription")}
        />
        <p className="text-xs text-foreground/70">
          {stats.data.lastPostedAt
            ? t("platformStats.lastPosted", {
                date: new Date(stats.data.lastPostedAt).toLocaleString(
                  i18n.language,
                  { dateStyle: "medium", timeStyle: "short" },
                ),
              })
            : t("platformStats.neverPosted")}
          {isDirty && ` ${t("platformStats.saveBeforePosting")}`}
        </p>
      </SettingsSection>

      <SettingsSection
        heading={t("discordChannels.channels.donations.heading")}
        description={t("discordChannels.channels.donations.description")}
      >
        {channelFields("donations")}
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("discordChannels.donationsLink")}
          <IconExternalLink className="size-3.5" />
        </a>
      </SettingsSection>

      <SettingsSection
        heading={t("discordChannels.channels.pricing.heading")}
        description={t("discordChannels.channels.pricing.description")}
      >
        {channelFields("pricing")}
        <AdminScriptCommand
          command={PRICE_SYNC_SCRIPT_COMMAND}
          description={t("discordChannels.priceSyncCommand")}
        />
      </SettingsSection>

      <SaveBar
        show={isDirty}
        onSave={() => void saveAll()}
        isSaving={isSaving}
        onDiscard={discardAll}
      />
      <UnsavedChangesGuard isDirty={isDirty} />
    </>
  );
}
