import { SettingsSection } from "@/components/settings-section";
import { DiscordChannelTargetFields } from "@/features/integrations/components/discord-channel-target-fields";
import type { DiscordChannelSettingsProps } from "@/lib/interfaces/integrations";
import { useTranslation } from "react-i18next";

export function DiscordChannelSettings({
  integration,
}: DiscordChannelSettingsProps) {
  const { t } = useTranslation("integrations");

  return (
    <SettingsSection
      heading={t("channelSettings.heading")}
      description={t("channelSettings.description")}
    >
      <div className="grid gap-3 md:gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <DiscordChannelTargetFields
          channelName="scanChannelId"
          roleName="scanRoleId"
          channelLabel={t("channelSettings.scan")}
          roleLabel={t("channelSettings.scanRole")}
          integration={integration}
        />
        <DiscordChannelTargetFields
          channelName="errorChannelId"
          roleName="errorRoleId"
          channelLabel={t("channelSettings.error")}
          roleLabel={t("channelSettings.errorRole")}
          integration={integration}
        />
        <DiscordChannelTargetFields
          channelName="tradeChannelId"
          roleName="tradeRoleId"
          channelLabel={t("channelSettings.trade")}
          roleLabel={t("channelSettings.tradeRole")}
          integration={integration}
        />
      </div>
      <p className="text-xs text-foreground/70">
        {t("channelSettings.roleHint")}
      </p>
    </SettingsSection>
  );
}
