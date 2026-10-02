import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { CollectionOverrideDialog } from "@/features/integrations/components/collection-override-dialog";
import { DiscordChannelSelect } from "@/features/integrations/components/discord-channel-select";
import { isOverrideRemoved } from "@/features/integrations/lib/discord-settings-draft";
import type { DiscordCollectionOverridesProps } from "@/lib/interfaces/integrations";
import type { DiscordSettingsDraftValues } from "@/schemas/discord-settings-draft.schema";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function DiscordCollectionOverrides({
  integration,
}: DiscordCollectionOverridesProps) {
  const { t } = useTranslation("integrations");
  const { control, formState, setValue } =
    useFormContext<DiscordSettingsDraftValues>();
  const draftOverrides = useWatch({ control, name: "overrides" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const channels = integration.guild?.channels ?? [];
  const disabled = !integration.guild || formState.isSubmitting;
  const overrides = integration.collections.filter(
    (override) => !isOverrideRemoved(override, draftOverrides),
  );

  return (
    <SettingsSection
      heading={t("overrides.heading")}
      description={t("overrides.description")}
      action={
        <Button
          variant="outline"
          onClick={() => setDialogOpen(true)}
          disabled={!integration.guild}
        >
          <IconPlus />
          {t("overrides.add")}
        </Button>
      }
    >
      {overrides.length === 0 ? (
        <p className="text-sm text-foreground/70">{t("overrides.empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          <li className="hidden gap-2 px-3 py-2 text-sm font-medium text-foreground/70 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <span>{t("overrides.collection")}</span>
            <span>{t("channelSettings.scan")}</span>
            <span>{t("channelSettings.error")}</span>
            <span className="w-9" />
          </li>
          {overrides.map((override) => (
            <li
              key={override.guid}
              className="grid items-center gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <span className="truncate text-sm font-medium">
                {override.name}
              </span>
              <Controller
                control={control}
                name={`overrides.${override.guid}.scanChannelId`}
                render={({ field }) => (
                  <DiscordChannelSelect
                    value={field.value ?? null}
                    channels={channels}
                    emptyLabel={t("channelSettings.sameScan")}
                    disabled={disabled}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name={`overrides.${override.guid}.errorChannelId`}
                render={({ field }) => (
                  <DiscordChannelSelect
                    value={field.value ?? null}
                    channels={channels}
                    emptyLabel={t("channelSettings.sameError")}
                    disabled={disabled}
                    onChange={field.onChange}
                  />
                )}
              />
              <Button
                size="icon"
                variant="outline-destructive"
                disabled={disabled}
                aria-label={t("overrides.remove", { name: override.name })}
                title={t("overrides.remove", { name: override.name })}
                onClick={() =>
                  setValue(
                    `overrides.${override.guid}`,
                    { scanChannelId: null, errorChannelId: null },
                    { shouldDirty: true },
                  )
                }
              >
                <IconTrash size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CollectionOverrideDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        integration={integration}
      />
    </SettingsSection>
  );
}
