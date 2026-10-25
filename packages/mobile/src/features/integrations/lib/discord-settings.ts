import type {
  DiscordChannel,
  DiscordIntegration,
  DiscordSettingsDraftFormValues,
  NotificationRule,
  OrgSettings,
} from "@magic-vault/shared";
import type { TFunction } from "i18next";
import type { DiscordChannelsDraft } from "@/lib/interfaces/integrations";

export function toDiscordSettingsDraft(
  integration: DiscordIntegration | null | undefined,
  rules: NotificationRule[],
  settings: OrgSettings | undefined,
): DiscordSettingsDraftFormValues {
  return {
    scanChannelId: integration?.scanChannelId ?? null,
    errorChannelId: integration?.errorChannelId ?? null,
    overrides: Object.fromEntries(
      (integration?.collections ?? []).map((override) => [
        override.guid,
        { scanChannelId: override.scanChannelId, errorChannelId: override.errorChannelId },
      ]),
    ),
    ruleEnabled: Object.fromEntries(rules.map((rule) => [rule.guid, rule.isEnabled])),
    discordNotifyOnScan: settings?.discordNotifyOnScan ?? false,
    discordScanUseThreads: settings?.discordScanUseThreads ?? true,
  };
}

export function changedDiscordChannels(
  current: DiscordChannelsDraft,
  draft: DiscordChannelsDraft,
): Partial<DiscordChannelsDraft> | null {
  const changed: Partial<DiscordChannelsDraft> = {};
  if (draft.scanChannelId !== current.scanChannelId) changed.scanChannelId = draft.scanChannelId;
  if (draft.errorChannelId !== current.errorChannelId) changed.errorChannelId = draft.errorChannelId;
  return Object.keys(changed).length ? changed : null;
}

export function channelLabel(channels: DiscordChannel[], id: string | null, t: TFunction, emptyLabel: string): string {
  if (!id) return emptyLabel;
  const channel = channels.find((c) => c.id === id);
  if (!channel) return t("settings.discord.channels.unknown", { id });
  return channel.categoryName
    ? `#${channel.name} ${t("settings.discord.channels.inCategory", { category: channel.categoryName })}`
    : `#${channel.name}`;
}
