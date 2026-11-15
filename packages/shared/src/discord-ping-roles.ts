import type {
  DiscordPingRoles,
  DiscordTradeNotificationTargets,
} from "./interfaces/integrations.interface";

export function changedDiscordPingRoles(
  current: DiscordPingRoles,
  draft: DiscordPingRoles,
): Partial<DiscordPingRoles> | null {
  const changed: Partial<DiscordPingRoles> = {};
  if (draft.scanRoleId !== current.scanRoleId) {
    changed.scanRoleId = draft.scanRoleId;
  }
  if (draft.errorRoleId !== current.errorRoleId) {
    changed.errorRoleId = draft.errorRoleId;
  }
  return Object.keys(changed).length ? changed : null;
}

export function changedDiscordTradeNotificationTargets(
  current: DiscordTradeNotificationTargets,
  draft: DiscordTradeNotificationTargets,
): Partial<DiscordTradeNotificationTargets> | null {
  const changed: Partial<DiscordTradeNotificationTargets> = {};
  if (draft.tradeChannelId !== current.tradeChannelId) {
    changed.tradeChannelId = draft.tradeChannelId;
  }
  if (draft.tradeRoleId !== current.tradeRoleId) {
    changed.tradeRoleId = draft.tradeRoleId;
  }
  return Object.keys(changed).length ? changed : null;
}
