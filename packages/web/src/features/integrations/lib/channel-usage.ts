import type {
  DiscordChannelUsage,
  DiscordChannelUsageRow,
} from "@/lib/interfaces/integrations";
import type { DiscordIntegration } from "@magic-vault/shared";

export function buildChannelUsageRows(
  integration: DiscordIntegration,
): DiscordChannelUsageRow[] {
  const usagesByChannel = new Map<string, DiscordChannelUsage[]>();
  const add = (channelId: string | null, usage: DiscordChannelUsage) => {
    if (!channelId) return;
    const usages = usagesByChannel.get(channelId) ?? [];
    usages.push(usage);
    usagesByChannel.set(channelId, usages);
  };

  add(integration.scanChannelId, {
    kind: "scans",
    paused: !integration.notifyOnScan,
  });
  add(integration.errorChannelId, { kind: "errors" });
  for (const collection of integration.collections) {
    add(collection.scanChannelId, {
      kind: "collectionScans",
      collection: collection.name,
    });
    add(collection.errorChannelId, {
      kind: "collectionErrors",
      collection: collection.name,
    });
  }
  for (const rule of integration.rules) {
    add(rule.channelId, {
      kind: "rule",
      rule: rule.name,
      game: rule.gameName,
      isEnabled: rule.isEnabled,
    });
  }

  const channels = integration.guild?.channels ?? [];
  return [...usagesByChannel].map(([channelId, usages]) => ({
    channelId,
    channel: channels.find((c) => c.id === channelId) ?? null,
    usages,
  }));
}
