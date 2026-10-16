import type { ConditionMultipliers } from "./card-condition.interface";
import type { PriceSource } from "./price-source.interface";

export interface MonitorLink {
  token: string;
  expiresAt: string;
}

export interface MonitorLinkInfo {
  collectionGuid: string;
  collectionName: string;
  expiresAt: string;
  priceSource: PriceSource;
  conditionMultipliers: ConditionMultipliers;
}
