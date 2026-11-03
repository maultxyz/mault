import { SettingsSection } from "@/components/settings-section";
import { Label } from "@/components/ui/label";
import { DiscordChannelSelect } from "@/features/integrations/components/discord-channel-select";
import { DiscordRoleSelect } from "@/features/integrations/components/discord-role-select";
import type { DiscordChannelSettingsProps } from "@/lib/interfaces/integrations";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { type DiscordSettingsDraftFormValues } from "@magic-vault/shared";

export function DiscordChannelSettings({
  integration,
}: DiscordChannelSettingsProps) {
  const { t } = useTranslation("integrations");
  const { control, formState } =
    useFormContext<DiscordSettingsDraftFormValues>();
  const [scanChannelId, errorChannelId] = useWatch({
    control,
    name: ["scanChannelId", "errorChannelId"],
  });
  const channels = integration.guild?.channels ?? [];
  const roles = integration.guild?.roles ?? [];
  const disabled = !integration.guild || formState.isSubmitting;

  return (
    <SettingsSection
      heading={t("channelSettings.heading")}
      description={t("channelSettings.description")}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
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
            <Label>{t("channelSettings.scanRole")}</Label>
            <Controller
              control={control}
              name="scanRoleId"
              render={({ field }) => (
                <DiscordRoleSelect
                  value={field.value}
                  roles={roles}
                  disabled={disabled || !scanChannelId}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
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
          <div className="flex flex-col gap-1.5">
            <Label>{t("channelSettings.errorRole")}</Label>
            <Controller
              control={control}
              name="errorRoleId"
              render={({ field }) => (
                <DiscordRoleSelect
                  value={field.value}
                  roles={roles}
                  disabled={disabled || !errorChannelId}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-foreground/70">
        {t("channelSettings.roleHint")}
      </p>
    </SettingsSection>
  );
}
