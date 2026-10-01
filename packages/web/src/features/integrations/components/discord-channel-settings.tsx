import { SettingsSection } from "@/components/settings-section";
import { Label } from "@/components/ui/label";
import { useSaveDiscordChannels } from "@/features/integrations/api/use-save-discord-channels";
import { DiscordChannelSelect } from "@/features/integrations/components/discord-channel-select";
import type { DiscordChannelSettingsProps } from "@/lib/interfaces/integrations";
import { useTranslation } from "react-i18next";

export function DiscordChannelSettings({
  integration,
}: DiscordChannelSettingsProps) {
  const { t } = useTranslation("integrations");
  const save = useSaveDiscordChannels();
  const channels = integration.guild?.channels ?? [];
  const disabled = !integration.guild || save.isPending;

  return (
    <SettingsSection
      heading={t("channelSettings.heading")}
      description={t("channelSettings.description")}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("channelSettings.scan")}</Label>
          <DiscordChannelSelect
            value={integration.scanChannelId}
            channels={channels}
            emptyLabel={t("channelSettings.none")}
            disabled={disabled}
            onChange={(scanChannelId) => save.mutate({ scanChannelId })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("channelSettings.error")}</Label>
          <DiscordChannelSelect
            value={integration.errorChannelId}
            channels={channels}
            emptyLabel={t("channelSettings.none")}
            disabled={disabled}
            onChange={(errorChannelId) => save.mutate({ errorChannelId })}
          />
        </div>
      </div>
    </SettingsSection>
  );
}
