import type { ScannerControlCommand } from "../interfaces/scanner-control-code.interface";

export const SCANNER_CONTROL_CODE_SCHEME = "mault-control:";

export const SCANNER_CONTROL_CODE_BASE_VERSION = 1;

export const SCANNER_CONTROL_CODE_VERSION = 2;

export const SCANNER_CONTROL_CODE_PARAMS = {
  collectionGuid: "collection",
  presetGuid: "preset",
  forcedFoilType: "foil",
  forcedSetCode: "set",
  condition: "condition",
  pauseScanner: "pause",
  autoFeed: "autoFeed",
  allowDuplicates: "duplicates",
  endBatch: "batch",
} as const satisfies Record<keyof Required<ScannerControlCommand>, string>;

export const SCANNER_CONTROL_CODE_PARAM_MIN_VERSIONS: Partial<
  Record<keyof ScannerControlCommand, number>
> = {
  endBatch: 2,
};

export const SCANNER_CONTROL_CODE_TRUE = "1";

export const SCANNER_CONTROL_CODE_FALSE = "0";
