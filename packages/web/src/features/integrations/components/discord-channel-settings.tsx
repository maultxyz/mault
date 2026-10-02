import { SettingsSection } from "@/components/settings-section";
import { Label } from "@/components/ui/label";
import { DiscordChannelSelect } from "@/features/integrations/components/discord-channel-select";
import type { DiscordChannelSettingsProps } from "@/lib/interfaces/integrations";
import type { DiscordSettingsDraftValues } from "@/schemas/discord-settings-draft.schema";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function DiscordChannelSettings({
  integration,
}: DiscordChannelSettingsProps) {
  const { t } = useTranslation("integrations");
  const { control, formState } =
    useFormContext<DiscordSettingsDraftValues>();
  const channels = integration.guild?.channels ?? [];
  const disabled = !integration.guild || formState.isSubmitting;

  return (
    <SettingsSection
      heading={t("channelSettings.heading")}
      description={t("channelSettings.description")}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("channelSettings.scan")}</Label>
          <Controller
            control={control}
            name="scanChannelId"
            render={({ field }) => (
              <DiscordChannelSelect
                value={field.value}
                channels={channels}
                emptyLabel={t("channelSettings.none")}
                disabled={disabled}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("channelSettings.error")}</Label>
          <Controller
            control={control}
            name="errorChannelId"
            render={({ field }) => (
              <DiscordChannelSelect
                value={field.value}
                channels={channels}
                emptyLabel={t("channelSettings.none")}
                disabled={disabled}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </div>
    </SettingsSection>
  );
}
