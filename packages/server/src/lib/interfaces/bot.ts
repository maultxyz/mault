import type {
  DirectionalSpeed,
  FeederCalibration,
  ModuleConfig,
  ServoPositionKey,
} from "@magic-vault/shared";
import type { BOT_SHOWCASE_KINDS } from "../constants/discord";

export type BotShowcaseKind = (typeof BOT_SHOWCASE_KINDS)[number];

export interface BotShowcaseTarget {
  guid: string;
  name: string;
  orgName: string;
}

export interface BotShowcase {
  kind: BotShowcaseKind;
  name: string;
  orgName: string;
  gameNames: string[];
  cardCount: number;
  totalValueDisplay: string;
  topCards: BotTopCard[];
}

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

export interface BotModuleCalibration extends ModuleConfig {
  positionPercents: Record<ServoPositionKey, number>;
}

export interface BotDeviceCalibration {
  deviceName: string;
  moduleCount: number;
  modules: BotModuleCalibration[];
  feeder: FeederCalibration;
  feederSpeeds: { speed: DirectionalSpeed; reverseSpeed: DirectionalSpeed };
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
