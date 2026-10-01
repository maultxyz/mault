import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { useSaveDiscordChannels } from "@/features/integrations/api/use-save-discord-channels";
import { CollectionOverrideDialog } from "@/features/integrations/components/collection-override-dialog";
import { DiscordChannelSelect } from "@/features/integrations/components/discord-channel-select";
import type { DiscordCollectionOverridesProps } from "@/lib/interfaces/integrations";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function DiscordCollectionOverrides({
  integration,
}: DiscordCollectionOverridesProps) {
  const { t } = useTranslation("integrations");
  const save = useSaveDiscordChannels();
  const [dialogOpen, setDialogOpen] = useState(false);
  const channels = integration.guild?.channels ?? [];
  const disabled = !integration.guild || save.isPending;
  const overrides = integration.collections;

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
              <DiscordChannelSelect
                value={override.scanChannelId}
                channels={channels}
                emptyLabel={t("channelSettings.sameScan")}
                disabled={disabled}
                onChange={(scanChannelId) =>
                  save.mutate({ collectionGuid: override.guid, scanChannelId })
                }
              />
              <DiscordChannelSelect
                value={override.errorChannelId}
                channels={channels}
                emptyLabel={t("channelSettings.sameError")}
                disabled={disabled}
                onChange={(errorChannelId) =>
                  save.mutate({ collectionGuid: override.guid, errorChannelId })
                }
              />
              <Button
                size="icon"
                variant="outline-destructive"
                disabled={save.isPending}
                aria-label={t("overrides.remove", { name: override.name })}
                title={t("overrides.remove", { name: override.name })}
                onClick={() =>
                  save.mutate({
                    collectionGuid: override.guid,
                    scanChannelId: null,
                    errorChannelId: null,
                  })
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
