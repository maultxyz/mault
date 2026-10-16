import type { BinConfig } from "./sort-bins.interface";

export type PickListMode = "all" | "until_found";

export interface PickListEntry {
  name: string;
  quantity: number;
  found: number;
}

export interface PickList {
  mode: PickListMode;
  entries: PickListEntry[];
}

export interface PickListEntryInput {
  name: string;
  quantity: number;
}

export interface PickListInput {
  mode: PickListMode;
  entries: PickListEntryInput[];
}

export interface PickListFoundInput {
  name: string;
  delta: number;
}

export interface PickListFoundResult {
  changed: boolean;
  pickList: PickList | null;
}

export interface PickListMatch {
  bin: BinConfig;
  entry: PickListEntry;
}

export interface PickListTotals {
  wanted: number;
  found: number;
}
