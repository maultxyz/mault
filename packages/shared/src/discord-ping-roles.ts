import type { DiscordPingRoles } from "./interfaces/integrations.interface";

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
