import type { FeederCalibration, ModuleConfig } from "@magic-vault/shared";

export interface BotTopCard {
  name: string;
  setName: string | null;
  foil: string | null;
  collectionName: string;
  priceDisplay: string;
  imageUrl: string | null;
}

export interface BotCollectionStats {
  collectionCount: number;
  cardCount: number;
  totalValue: number;
  totalValueDisplay: string;
  collectionName?: string;
  topCard: BotTopCard | null;
}

export interface BotCalibrationDevice {
  guid: string;
  name: string;
  orgName: string;
  moduleCount: number;
}

export interface BotDeviceCalibration {
  deviceName: string;
  moduleCount: number;
  modules: ModuleConfig[];
  feeder: FeederCalibration;
}

export interface BotRulePreset {
  guid: string;
  name: string;
  orgName: string;
  gameName: string | null;
  isActive: boolean;
}

export interface BotRulePresetDetails {
  presetName: string;
  gameName: string | null;
  modeLabel: string | null;
  binLines: string[];
}
