import { SINGLE_KEY_HOTKEYS_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { createStoredBooleanStore } from "@/lib/stored-boolean-store";

const singleKeyHotkeysStore = createStoredBooleanStore(SINGLE_KEY_HOTKEYS_STORAGE_KEY, true);

export const areSingleKeyHotkeysEnabled = singleKeyHotkeysStore.get;
export const setSingleKeyHotkeysEnabled = singleKeyHotkeysStore.set;
export const useSingleKeyHotkeysEnabled = singleKeyHotkeysStore.useValue;
