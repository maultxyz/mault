import { isCardCondition } from "./card-condition";
import {
  SCANNER_CONTROL_CODE_FALSE,
  SCANNER_CONTROL_CODE_PARAMS,
  SCANNER_CONTROL_CODE_SCHEME,
  SCANNER_CONTROL_CODE_TRUE,
  SCANNER_CONTROL_CODE_VERSION,
} from "./constants/scanner-control-code.constant";
import type {
  ScannerControlCommandAction,
  ScannerControlCommand,
  ScannerControlCommandNames,
  ScannerControlCommandProblem,
  ScannerControlTargets,
} from "./interfaces/scanner-control-code.interface";

const SCANNER_CONTROL_CODE_PREFIX = `${SCANNER_CONTROL_CODE_SCHEME}${SCANNER_CONTROL_CODE_VERSION}?`;

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
    command.allowDuplicates !== undefined
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
  const query = pairs
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `${SCANNER_CONTROL_CODE_PREFIX}${query}`;
}

export function parseScannerControlCode(text: string): ScannerControlCommand | null {
  if (!text.startsWith(SCANNER_CONTROL_CODE_PREFIX)) return null;
  const params = SCANNER_CONTROL_CODE_PARAMS;
  const command: ScannerControlCommand = {};
  for (const pair of text.slice(SCANNER_CONTROL_CODE_PREFIX.length).split("&")) {
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
      default:
        return null;
    }
  }
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
  if (command.pauseScanner) actions.push({ key: "pause", values: {} });
  return actions;
}
