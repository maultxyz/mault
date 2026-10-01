import { SettingsSection } from "@/components/settings-section";
import { Label } from "@/components/ui/label";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { setDiscordChannel } from "@/features/integrations/api/integrations";
import { DiscordChannelSelect } from "@/features/integrations/components/discord-channel-select";
import type { DiscordChannelSettingsProps } from "@/lib/interfaces/integrations";
import { toast } from "@/lib/toast";
import type { DiscordChannelInput } from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function DiscordChannelSettings({
  integration,
}: DiscordChannelSettingsProps) {
  const { t } = useTranslation("integrations");
  const { activeOrg } = useOrg();
  const { collections } = useCollections();
  const queryClient = useQueryClient();
  const channels = integration.guild?.channels ?? [];
  const disabled = !integration.guild;

  const save = useMutation({
    mutationFn: (input: DiscordChannelInput) => setDiscordChannel(input),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message || t("channelSettings.saveFailed"));
        return;
      }
      toast.success(t("channelSettings.saved"));
    },
    onError: () => toast.error(t("channelSettings.saveFailed")),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["discord-integration", activeOrg?.id],
      }),
  });

  const overrideFor = (guid: string) =>
    integration.collections.find((c) => c.guid === guid);

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
            disabled={disabled || save.isPending}
            onChange={(channelId) => save.mutate({ kind: "scan", channelId })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("channelSettings.error")}</Label>
          <DiscordChannelSelect
            value={integration.errorChannelId}
            channels={channels}
            emptyLabel={t("channelSettings.none")}
            disabled={disabled || save.isPending}
            onChange={(channelId) => save.mutate({ kind: "error", channelId })}
          />
        </div>
      </div>

      {collections.length > 0 && (
        <div className="flex flex-col gap-2">
          <div>
            <h3 className="text-sm font-medium">
              {t("channelSettings.perCollection")}
            </h3>
            <p className="text-sm text-foreground/70">
              {t("channelSettings.perCollectionDescription")}
            </p>
          </div>
          <ul className="flex flex-col divide-y rounded-lg border">
            {collections.map((collection) => {
              const override = overrideFor(collection.guid);
              return (
                <li
                  key={collection.guid}
                  className="grid items-center gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
                >
                  <span className="truncate text-sm font-medium">
                    {collection.name}
                  </span>
                  <DiscordChannelSelect
                    value={override?.scanChannelId ?? null}
                    channels={channels}
                    emptyLabel={t("channelSettings.sameScan")}
                    disabled={disabled || save.isPending}
                    onChange={(channelId) =>
                      save.mutate({
                        kind: "scan",
                        channelId,
                        collectionGuid: collection.guid,
                      })
                    }
                  />
                  <DiscordChannelSelect
                    value={override?.errorChannelId ?? null}
                    channels={channels}
                    emptyLabel={t("channelSettings.sameError")}
                    disabled={disabled || save.isPending}
                    onChange={(channelId) =>
                      save.mutate({
                        kind: "error",
                        channelId,
                        collectionGuid: collection.guid,
                      })
                    }
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </SettingsSection>
  );
}
