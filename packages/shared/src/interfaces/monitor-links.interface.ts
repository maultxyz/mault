import type { SHARE_LINK_KINDS, SHARE_LINK_PURPOSES } from "../constants/monitor-links.constant";
import type { ConditionMultipliers } from "./card-condition.interface";
import type { PriceSource } from "./price-source.interface";

export type ShareLinkPurpose = (typeof SHARE_LINK_PURPOSES)[number];
export type ShareLinkKind = (typeof SHARE_LINK_KINDS)[number];

export interface MonitorLink {
  guid: string;
  token: string;
  shortCode: string;
  shortUrl?: string | null;
  expiresAt: string;
}

export interface ShortLinkTarget {
  path: string;
}

export interface ShortLinkReference {
  shortCode: string;
  shortUrl?: string | null;
}

export interface ShortenerLink {
  code: string;
  targetPath: string;
  expiresAt: string | null;
}

export interface ShortenerRegisterLinksRequest {
  links: ShortenerLink[];
}

export interface ShortenerDeleteLinksRequest {
  codes: string[];
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
  shortCode: string;
  shortUrl?: string | null;
}
