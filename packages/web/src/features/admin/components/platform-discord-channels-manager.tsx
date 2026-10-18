import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import { Callout } from "@/components/callout";
import { ListSkeleton } from "@/components/list-skeleton";
import { SaveBar } from "@/components/save-bar";
import { SettingsSection } from "@/components/settings-section";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { usePlatformDiscordChannelsDraft } from "@/features/admin/api/use-platform-discord-channels-draft";
import { PlatformDiscordChannelFields } from "@/features/admin/components/platform-discord-channel-fields";
import { PLATFORM_DISCORD_CHANNEL_KEYS } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function PlatformDiscordChannelsManager() {
  const { t } = useTranslation("admin");
  const { form, data, isLoading, save } = usePlatformDiscordChannelsDraft();
  const { isDirty, isSubmitting } = form.formState;

  if (isLoading || !data) {
    return (
      <SettingsSection heading={t("discordChannels.channels.stats.heading")}>
        <ListSkeleton />
      </SettingsSection>
    );
  }

  return (
    <form id="discord-channels-form" onSubmit={save} className="contents">
      {!data.botReachable && (
        <Callout variant="warning">{t("discordChannels.botUnreachable")}</Callout>
      )}

      {PLATFORM_DISCORD_CHANNEL_KEYS.map((key) => (
        <SettingsSection
          key={key}
          heading={t(`discordChannels.channels.${key}.heading`)}
          description={t(`discordChannels.channels.${key}.description`)}
        >
          <PlatformDiscordChannelFields
            form={form}
            channelKey={key}
            guilds={data.guilds}
            botReachable={data.botReachable}
          />
        </SettingsSection>
      ))}

      <SaveBar
        show={isDirty}
        formId="discord-channels-form"
        isSaving={isSubmitting}
        onDiscard={() => form.reset(undefined, DISCARD_RESET_OPTIONS)}
      />
      <UnsavedChangesGuard isDirty={isDirty} />
    </form>
  );
}
