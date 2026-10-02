import type { OrgSettings } from "@/features/companies/api/org-settings";
import type {
  DiscordChannelsDraft,
  DiscordSettingsDraftValues,
} from "@/schemas/discord-settings-draft.schema";
import type {
  DiscordCollectionChannels,
  DiscordIntegration,
  NotificationRule,
} from "@magic-vault/shared";

export function toDiscordSettingsDraft(
  integration: DiscordIntegration | null | undefined,
  rules: NotificationRule[],
  settings: OrgSettings | undefined,
): DiscordSettingsDraftValues {
  return {
    scanChannelId: integration?.scanChannelId ?? null,
    errorChannelId: integration?.errorChannelId ?? null,
    overrides: Object.fromEntries(
      (integration?.collections ?? []).map((override) => [
        override.guid,
        {
          scanChannelId: override.scanChannelId,
          errorChannelId: override.errorChannelId,
        },
      ]),
    ),
    ruleEnabled: Object.fromEntries(
      rules.map((rule) => [rule.guid, rule.isEnabled]),
    ),
    discordNotifyOnScan: settings?.discordNotifyOnScan ?? false,
    discordScanUseThreads: settings?.discordScanUseThreads ?? true,
  };
}

export function changedDiscordChannels(
  current: DiscordChannelsDraft,
  draft: DiscordChannelsDraft,
): Partial<DiscordChannelsDraft> | null {
  const changed: Partial<DiscordChannelsDraft> = {};
  if (draft.scanChannelId !== current.scanChannelId) {
    changed.scanChannelId = draft.scanChannelId;
  }
  if (draft.errorChannelId !== current.errorChannelId) {
    changed.errorChannelId = draft.errorChannelId;
  }
  return Object.keys(changed).length ? changed : null;
}

export function isOverrideRemoved(
  override: DiscordCollectionChannels,
  overrides: DiscordSettingsDraftValues["overrides"],
): boolean {
  const channels = overrides[override.guid];
  return !!channels && !channels.scanChannelId && !channels.errorChannelId;
}
