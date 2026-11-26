import { isCardCondition } from "./card-condition";
import {
  SCANNER_CONTROL_CODE_BASE_VERSION,
  SCANNER_CONTROL_CODE_FALSE,
  SCANNER_CONTROL_CODE_PARAM_MIN_VERSIONS,
  SCANNER_CONTROL_CODE_PARAMS,
  SCANNER_CONTROL_CODE_SCHEME,
  SCANNER_CONTROL_CODE_TRUE,
  SCANNER_CONTROL_CODE_VERSION,
} from "./constants/scanner-control-code.constant";
import { resolveRemovalBinNumber } from "./scan-removal";
import type {
  ScannerControlCommandAction,
  ScannerControlCommand,
  ScannerControlCommandNames,
  ScannerControlCommandProblem,
  ScannerControlTargets,
} from "./interfaces/scanner-control-code.interface";
import type { BinConfig } from "./interfaces/sort-bins.interface";

function scannerControlCodePrefix(version: number): string {
  return `${SCANNER_CONTROL_CODE_SCHEME}${version}?`;
}

function requiredScannerControlCodeVersion(command: ScannerControlCommand): number {
  let version = SCANNER_CONTROL_CODE_BASE_VERSION;
  for (const [key, minVersion] of Object.entries(SCANNER_CONTROL_CODE_PARAM_MIN_VERSIONS)) {
    if (command[key as keyof ScannerControlCommand] !== undefined) {
      version = Math.max(version, minVersion);
    }
  }
  return version;
}

function parseScannerControlCodeVersion(
  text: string,
): { version: number; query: string } | null {
  for (
    let version = SCANNER_CONTROL_CODE_BASE_VERSION;
    version <= SCANNER_CONTROL_CODE_VERSION;
    version++
  ) {
    const prefix = scannerControlCodePrefix(version);
    if (text.startsWith(prefix)) return { version, query: text.slice(prefix.length) };
  }
  return null;
}

export function isScannerControlCode(text: string): boolean {
  return text.startsWith(SCANNER_CONTROL_CODE_SCHEME);
}

export function hasScannerControlChanges(command: ScannerControlCommand): boolean {
  return (
    !!command.collectionGuid ||
    !!command.presetGuid ||
    command.forcedFoilType !== undefined ||
    command.forcedSetCode !== undefined ||
    command.condition !== undefined ||
    !!command.pauseScanner ||
    command.autoFeed !== undefined ||
    command.allowDuplicates !== undefined ||
    !!command.endBatch
  );
}

function encodeBoolean(value: boolean): string {
  return value ? SCANNER_CONTROL_CODE_TRUE : SCANNER_CONTROL_CODE_FALSE;
}

function parseBoolean(value: string): boolean | null {
  if (value === SCANNER_CONTROL_CODE_TRUE) return true;
  if (value === SCANNER_CONTROL_CODE_FALSE) return false;
  return null;
}

export function encodeScannerControlCode(command: ScannerControlCommand): string {
  const params = SCANNER_CONTROL_CODE_PARAMS;
  const pairs: [string, string][] = [];
  if (command.collectionGuid) pairs.push([params.collectionGuid, command.collectionGuid]);
  if (command.presetGuid) pairs.push([params.presetGuid, command.presetGuid]);
  if (command.forcedFoilType !== undefined) {
    pairs.push([params.forcedFoilType, command.forcedFoilType ?? ""]);
  }
  if (command.forcedSetCode !== undefined) {
    pairs.push([params.forcedSetCode, command.forcedSetCode ?? ""]);
  }
  if (command.condition) pairs.push([params.condition, command.condition]);
  if (command.pauseScanner) pairs.push([params.pauseScanner, SCANNER_CONTROL_CODE_TRUE]);
  if (command.autoFeed !== undefined) pairs.push([params.autoFeed, encodeBoolean(command.autoFeed)]);
  if (command.allowDuplicates !== undefined) {
    pairs.push([params.allowDuplicates, encodeBoolean(command.allowDuplicates)]);
  }
  if (command.endBatch) pairs.push([params.endBatch, SCANNER_CONTROL_CODE_TRUE]);
  const query = pairs
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `${scannerControlCodePrefix(requiredScannerControlCodeVersion(command))}${query}`;
}

export function parseScannerControlCode(text: string): ScannerControlCommand | null {
  const versioned = parseScannerControlCodeVersion(text);
  if (!versioned) return null;
  const params = SCANNER_CONTROL_CODE_PARAMS;
  const command: ScannerControlCommand = {};
  for (const pair of versioned.query.split("&")) {
    if (!pair) continue;
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex < 0) return null;
    const key = pair.slice(0, separatorIndex);
    let value: string;
    try {
      value = decodeURIComponent(pair.slice(separatorIndex + 1));
    } catch {
      return null;
    }
    switch (key) {
      case params.collectionGuid:
        if (!value) return null;
        command.collectionGuid = value;
        break;
      case params.presetGuid:
        if (!value) return null;
        command.presetGuid = value;
        break;
      case params.forcedFoilType:
        command.forcedFoilType = value || null;
        break;
      case params.forcedSetCode:
        command.forcedSetCode = value || null;
        break;
      case params.condition:
        if (!isCardCondition(value)) return null;
        command.condition = value;
        break;
      case params.pauseScanner: {
        const pauseScanner = parseBoolean(value);
        if (pauseScanner == null) return null;
        command.pauseScanner = pauseScanner;
        break;
      }
      case params.autoFeed: {
        const autoFeed = parseBoolean(value);
        if (autoFeed == null) return null;
        command.autoFeed = autoFeed;
        break;
      }
      case params.allowDuplicates: {
        const allowDuplicates = parseBoolean(value);
        if (allowDuplicates == null) return null;
        command.allowDuplicates = allowDuplicates;
        break;
      }
      case params.endBatch: {
        const endBatch = parseBoolean(value);
        if (endBatch == null) return null;
        command.endBatch = endBatch;
        break;
      }
      default:
        return null;
    }
  }
  if (requiredScannerControlCodeVersion(command) > versioned.version) return null;
  return hasScannerControlChanges(command) ? command : null;
}

export function findScannerControlCommandProblem(
  command: ScannerControlCommand,
  targets: ScannerControlTargets,
): ScannerControlCommandProblem | null {
  const targetCollectionGuid = command.collectionGuid ?? targets.activeCollectionGuid;
  const targetCollection = targets.collections.find(
    (collection) => collection.guid === targetCollectionGuid,
  );
  if (command.collectionGuid && !targetCollection) return "collection-not-found";
  if (!command.presetGuid) return null;
  const preset = targets.presets.find((candidate) => candidate.guid === command.presetGuid);
  if (!preset) return "preset-not-found";
  if (!targetCollection) return "no-collection";
  if ((preset.game?.guid ?? null) !== (targetCollection.game?.guid ?? null)) {
    return "preset-wrong-game";
  }
  return null;
}

export function listScannerControlActions(
  command: ScannerControlCommand,
  names: ScannerControlCommandNames,
): ScannerControlCommandAction[] {
  const actions: ScannerControlCommandAction[] = [];
  if (command.collectionGuid) {
    actions.push({
      key: "collection",
      values: { name: names.collectionName(command.collectionGuid) },
    });
  }
  if (command.presetGuid) {
    actions.push({ key: "preset", values: { name: names.presetName(command.presetGuid) } });
  }
  if (command.forcedFoilType !== undefined) {
    actions.push(
      command.forcedFoilType
        ? { key: "foil", values: { type: command.forcedFoilType } }
        : { key: "notFoil", values: {} },
    );
  }
  if (command.forcedSetCode !== undefined) {
    actions.push(
      command.forcedSetCode
        ? { key: "set", values: { name: names.setName(command.forcedSetCode) } }
        : { key: "anySet", values: {} },
    );
  }
  if (command.condition) {
    actions.push({
      key: "condition",
      values: { condition: names.conditionName(command.condition) },
    });
  }
  if (command.autoFeed !== undefined) {
    actions.push({ key: command.autoFeed ? "autoFeedOn" : "autoFeedOff", values: {} });
  }
  if (command.allowDuplicates !== undefined) {
    actions.push({ key: command.allowDuplicates ? "duplicatesOn" : "duplicatesOff", values: {} });
  }
  if (command.endBatch) actions.push({ key: "endBatch", values: {} });
  if (command.pauseScanner) actions.push({ key: "pause", values: {} });
  return actions;
}

export function resolveControlCardBinNumber(
  binConfigs: BinConfig[],
  command: ScannerControlCommand | null,
  lastScannedCardBinNumber: number | null,
): number | null {
  return resolveRemovalBinNumber(
    binConfigs,
    command?.endBatch ? lastScannedCardBinNumber : null,
  );
}
