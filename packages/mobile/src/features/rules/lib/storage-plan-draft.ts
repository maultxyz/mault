import { PRESET_FILL_STORAGE_LOCATIONS_MAX } from "@magic-vault/shared";
import type { StoragePlanDraft } from "@/lib/interfaces/rules";

const listeners = new Set<() => void>();
let draft: StoragePlanDraft = { isOpen: false, locationGuids: [] };

function update(next: StoragePlanDraft): void {
  draft = next;
  for (const listener of listeners) listener();
}

export function subscribeToStoragePlanDraft(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readStoragePlanDraft(): StoragePlanDraft {
  return draft;
}

export function openStoragePlanDraft(locationGuids: string[]): void {
  update({ isOpen: true, locationGuids });
}

export function closeStoragePlanDraft(): void {
  update({ isOpen: false, locationGuids: [] });
}

export function setStoragePlanDraftLocations(locationGuids: string[]): void {
  if (!draft.isOpen) return;
  update({ ...draft, locationGuids: locationGuids.slice(0, PRESET_FILL_STORAGE_LOCATIONS_MAX) });
}

export function appendToStoragePlanDraft(locationGuids: string[]): void {
  setStoragePlanDraftLocations([
    ...draft.locationGuids,
    ...locationGuids.filter((guid) => !draft.locationGuids.includes(guid)),
  ]);
}
