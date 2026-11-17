import {
  STORAGE_PICK_LIST_STORAGE_KEY_PREFIX,
  STORAGE_VERIFY_STORAGE_KEY_PREFIX,
} from "@magic-vault/shared";

export function storagePickListStorageKey(orgId: string | undefined): string {
  return `${STORAGE_PICK_LIST_STORAGE_KEY_PREFIX}${orgId ?? ""}`;
}

export function storageVerifyStorageKey(
  orgId: string | undefined,
  locationGuid: string,
): string {
  return `${STORAGE_VERIFY_STORAGE_KEY_PREFIX}${orgId ?? ""}:${locationGuid}`;
}
