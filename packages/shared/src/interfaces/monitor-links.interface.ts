import type {
  CUSTOM_SHORT_LINK_FAILURE_REASONS,
  SHARE_LINK_KINDS,
  SHARE_LINK_PURPOSES,
} from "../constants/monitor-links.constant";
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

export type CardShareLink = MonitorLink;

export interface SharedCardLink extends ShareableLink {
  guid: string;
  scanId: string;
  cardName: string;
  setCode: string | null;
  createdAt: string;
  shortCode: string;
}

export interface CardShareLinkInfo {
  scanId: string;
  cardName: string;
  priceSource: PriceSource;
  conditionMultipliers: ConditionMultipliers;
  showsPrices: boolean;
}

export interface ShortLinkTarget {
  path: string;
}

export interface ShareableLink {
  kind: ShareLinkKind;
  subjectGuid: string;
  token: string;
  shortUrl?: string | null;
}

export interface ShareableShopCatalog {
  guid: string;
  isPublic: boolean;
  linkToken: string | null;
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
  requiresGuestContact?: boolean;
  purpose: ShareLinkPurpose;
}

export type BrowsableShareLinkKind = Exclude<ShareLinkKind, "card">;

export interface ParsedShareLinkUrl {
  kind: BrowsableShareLinkKind;
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

export interface ShortenerCustomLink {
  code: string;
  targetUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomShortLink extends ShortenerCustomLink {
  shortUrl: string;
}

export type CustomShortLinkFailureReason = (typeof CUSTOM_SHORT_LINK_FAILURE_REASONS)[number];

export interface CustomShortLinkResult<T> {
  success: boolean;
  message?: string;
  reason?: CustomShortLinkFailureReason;
  data?: T;
}

export interface CustomShortLinksOverview {
  enabled: boolean;
  shortLinkBaseUrl: string | null;
  links: CustomShortLink[];
}
