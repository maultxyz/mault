import { PENDING_SCAN_SAVES_KEY } from "@/lib/constants/storage-keys";
import type { PendingScanSave } from "@/lib/interfaces/scanner";
import { readKvJson, writeKvJson } from "@/lib/storage/kv";

export function listPendingSaves(): PendingScanSave[] {
  return readKvJson<PendingScanSave[]>(PENDING_SCAN_SAVES_KEY, []);
}

export function putPendingSave(save: PendingScanSave): void {
  writeKvJson(PENDING_SCAN_SAVES_KEY, [
    ...listPendingSaves().filter((s) => s.key !== save.key),
    save,
  ]);
}

export function deletePendingSave(key: string): void {
  writeKvJson(
    PENDING_SCAN_SAVES_KEY,
    listPendingSaves().filter((s) => s.key !== key),
  );
}
