import type { StorageLocation } from "./storage-locations.interface";

export type StoragePlanLocationStatus = "full" | "filling" | "waiting";

export interface StoragePlanRow {
  location: StorageLocation;
  order: number;
  usedSlots: number;
  capacity: number | null;
  remainingSlots: number | null;
  fillPercent: number | null;
  fillingBinNumber: number | null;
  status: StoragePlanLocationStatus;
}

export interface StoragePlanBinClaim {
  binNumber: number;
  locationName: string | null;
  remainingSlots: number | null;
}

export interface StoragePlanSummary {
  total: number;
  full: number;
  firstName: string | null;
  lastName: string | null;
}

export interface StorageLocationPresetUse {
  presetGuid: string;
  presetName: string;
  gameName: string | null;
  isActive: boolean;
  planPosition: number;
  planLength: number;
  fillingBinNumber: number | null;
}
