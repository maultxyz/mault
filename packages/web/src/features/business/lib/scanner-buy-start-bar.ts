import { SCANNER_BUY_START_HIDDEN_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { createStoredFlag } from "@/lib/stored-flag";

export const useScannerBuyStartBarHidden = createStoredFlag(SCANNER_BUY_START_HIDDEN_STORAGE_KEY);
