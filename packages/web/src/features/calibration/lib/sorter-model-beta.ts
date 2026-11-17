import { SORTER_MODEL_BETA_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { createStoredFlag } from "@/lib/stored-flag";

export const useSorterModelBeta = createStoredFlag(SORTER_MODEL_BETA_STORAGE_KEY);
