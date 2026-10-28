import {
  SYNC_API_KEY_PERMISSIONS,
  type SyncApiKeyPermission,
} from "@magic-vault/shared";

export function toSyncApiKeyPermissions(
  values: readonly string[],
): SyncApiKeyPermission[] {
  return SYNC_API_KEY_PERMISSIONS.filter((permission) =>
    values.includes(permission),
  );
}

export function syncStartPermissionFor(
  forceResync: boolean,
): SyncApiKeyPermission {
  return forceResync ? "sync_force" : "sync_start";
}

export function hasSyncApiKeyPermission(
  grantedPermissions: readonly SyncApiKeyPermission[],
  requiredPermission: SyncApiKeyPermission,
): boolean {
  return grantedPermissions.includes(requiredPermission);
}
