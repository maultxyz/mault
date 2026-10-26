import type { CardCondition } from "./card-condition.interface";
import type { Collection } from "./collections.interface";
import type { BinSet } from "./sort-bins.interface";

export interface ScannerControlCommand {
  collectionGuid?: string;
  presetGuid?: string;
  forcedFoilType?: string | null;
  forcedSetCode?: string | null;
  condition?: CardCondition;
  pauseScanner?: boolean;
  autoFeed?: boolean;
  allowDuplicates?: boolean;
}

export type ScannerControlCommandProblem =
  | "collection-not-found"
  | "preset-not-found"
  | "preset-wrong-game"
  | "no-collection";

export interface ScannerControlCommandNames {
  collectionName: (collectionGuid: string) => string;
  presetName: (presetGuid: string) => string;
  setName: (setCode: string) => string;
  conditionName: (condition: CardCondition) => string;
}

export type ScannerControlCommandActionKey =
  | "collection"
  | "preset"
  | "foil"
  | "notFoil"
  | "set"
  | "anySet"
  | "condition"
  | "autoFeedOn"
  | "autoFeedOff"
  | "duplicatesOn"
  | "duplicatesOff"
  | "pause";

export interface ScannerControlCommandAction {
  key: ScannerControlCommandActionKey;
  values: Record<string, string>;
}

export interface ScannerControlTargets {
  collections: Pick<Collection, "guid" | "game">[];
  presets: Pick<BinSet, "guid" | "game">[];
  activeCollectionGuid: string | null | undefined;
}
