import type { BinRuleGroup } from "./sort-bins.interface";

export interface SoundClip {
  guid: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  url: string | null;
  waveform: number[] | null;
  createdAt: string;
}

export interface SoundRule {
  guid: string;
  gameGuid: string;
  name: string;
  position: number;
  isEnabled: boolean;
  rules: BinRuleGroup;
  clipGuid: string | null;
}

export interface SoundRuleInput {
  name: string;
  isEnabled: boolean;
  rules: BinRuleGroup;
  clipGuid: string | null;
}
