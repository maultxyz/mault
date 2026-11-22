import type { BinConfig } from "./sort-bins.interface";

export type PickListMode = "all" | "until_found";

/**
 * What a pick list knows about a wanted card or a scanned card. The name is
 * the only required bit; printing data sharpens the match when both sides
 * have it.
 */
export interface PickListCard {
  name: string;
  setCode?: string | null;
  collectorNumber?: string | null;
  isFoil?: boolean | null;
}

export interface PickListEntry extends PickListCard {
  quantity: number;
  found: number;
}

export interface PickList {
  mode: PickListMode;
  entries: PickListEntry[];
}

export interface PickListEntryInput extends PickListCard {
  quantity: number;
}

export interface PickListInput {
  mode: PickListMode;
  entries: PickListEntryInput[];
}

export interface PickListFoundInput extends PickListCard {
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
