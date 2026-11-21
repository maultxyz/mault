import type { PersistedScanSettings } from "../interfaces/scan-settings.interface";
import { DEFAULT_CARD_CONDITION } from "./card-condition.constant";

export const DEFAULT_PERSISTED_SCAN_SETTINGS: PersistedScanSettings = {
  foilType: null,
  preferredSetCodes: [],
  condition: DEFAULT_CARD_CONDITION,
  gameKey: null,
};
