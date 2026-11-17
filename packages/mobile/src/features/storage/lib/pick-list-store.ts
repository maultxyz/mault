import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  parseStoredStoragePickList,
  parseStoredStorageVerify,
  STORAGE_PICK_LIST_STORAGE_KEY_PREFIX,
  STORAGE_VERIFY_STORAGE_KEY_PREFIX,
} from "@magic-vault/shared";
import { readKv, writeKvJson } from "@/lib/storage/kv";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useStoredKvJson<T>(storageKey: string, parse: (raw: string | null) => T) {
  const raw = useSyncExternalStore(subscribe, () => readKv(storageKey));
  const stored = useMemo(() => parse(raw), [parse, raw]);
  const update = useCallback(
    (change: (current: T) => T) => {
      writeKvJson(storageKey, change(parse(readKv(storageKey))));
      listeners.forEach((listener) => listener());
    },
    [parse, storageKey],
  );
  return [stored, update] as const;
}

export function useStoredPickList(orgId: string | null) {
  return useStoredKvJson(`${STORAGE_PICK_LIST_STORAGE_KEY_PREFIX}${orgId ?? ""}`, parseStoredStoragePickList);
}

export function useStoredVerify(orgId: string | null, locationGuid: string) {
  return useStoredKvJson(
    `${STORAGE_VERIFY_STORAGE_KEY_PREFIX}${orgId ?? ""}:${locationGuid}`,
    parseStoredStorageVerify,
  );
}
