import { Label } from "@/components/ui/label";
import { DiscordChannelSelect } from "@/features/integrations/components/discord-channel-select";
import { DiscordRoleSelect } from "@/features/integrations/components/discord-role-select";
import type { DiscordChannelTargetFieldsProps } from "@/lib/interfaces/integrations";
import { type DiscordSettingsDraftFormValues } from "@magic-vault/shared";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function DiscordChannelTargetFields({
  channelName,
  roleName,
  channelLabel,
  roleLabel,
  integration,
}: DiscordChannelTargetFieldsProps) {
  const { t } = useTranslation("integrations");
  const { control, formState } = useFormContext<DiscordSettingsDraftFormValues>();
  const channelId = useWatch({ control, name: channelName });
  const disabled = !integration.guild || formState.isSubmitting;

  return (
    <div className="flex flex-col gap-3 md:gap-2">
      <div className="flex flex-col gap-1.5">
        <Label>{channelLabel}</Label>
        <Controller
          control={control}
          name={channelName}
          render={({ field }) => (
            <DiscordChannelSelect
              aria-label={channelLabel}
              value={field.value}
              channels={integration.guild?.channels ?? []}
              emptyLabel={t("channelSettings.none")}
              disabled={disabled}
              onChange={field.onChange}
            />
          )}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{roleLabel}</Label>
        <Controller
          control={control}
          name={roleName}
          render={({ field }) => (
            <DiscordRoleSelect
              aria-label={roleLabel}
              value={field.value}
              roles={integration.guild?.roles ?? []}
              disabled={disabled || !channelId}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </div>
  );
}
