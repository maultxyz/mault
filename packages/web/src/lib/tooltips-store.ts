import { TOOLTIPS_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { createStoredBooleanStore } from "@/lib/stored-boolean-store";

const tooltipsStore = createStoredBooleanStore(TOOLTIPS_STORAGE_KEY, true);

export const setTooltipsEnabled = tooltipsStore.set;
export const useTooltipsEnabled = tooltipsStore.useValue;
