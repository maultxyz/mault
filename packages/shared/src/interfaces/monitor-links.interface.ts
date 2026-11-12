import type { SHARE_LINK_KINDS, SHARE_LINK_PURPOSES } from "../constants/monitor-links.constant";
import type { ConditionMultipliers } from "./card-condition.interface";
import type { PriceSource } from "./price-source.interface";

export type ShareLinkPurpose = (typeof SHARE_LINK_PURPOSES)[number];
export type ShareLinkKind = (typeof SHARE_LINK_KINDS)[number];

export interface MonitorLink {
  guid: string;
  token: string;
  expiresAt: string;
}

export interface MonitorLinkInfo {
  collectionGuid: string;
  collectionName: string;
  expiresAt: string;
  priceSource: PriceSource;
  conditionMultipliers: ConditionMultipliers;
  showsPrices: boolean;
  purpose: ShareLinkPurpose;
}

export interface ParsedShareLinkUrl {
  kind: ShareLinkKind;
  guid: string;
  token: string;
}

export interface OrgShareLink {
  guid: string;
  kind: ShareLinkKind;
  subjectGuid: string;
  subjectName: string;
  purpose: ShareLinkPurpose;
  showsPrices: boolean;
  createdAt: string;
  expiresAt: string;
  token: string;
}
