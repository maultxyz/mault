import type { ShareLinkKind, ShareLinkPurpose } from "@magic-vault/shared";
export interface ShareTokenSignInput {
  issuer: string;
  linkGuid: string;
  subjectGuid: string;
  orgId: string;
  version: number;
  issuedAt: Date;
  expiresAt: Date;
  showsPrices: boolean;
  requiresGuestContact?: boolean;
  purpose: ShareLinkPurpose;
}

export interface IssueShareLinkInput {
  orgId: string;
  kind: ShareLinkKind;
  subjectId: number;
  subjectGuid: string;
  subjectVersion: number;
  purpose: ShareLinkPurpose;
  showsPrices: boolean;
  requiresGuestContact: boolean;
  expiresInMinutes: number;
  createdByUserId: string;
}

export interface IssuedShareLink {
  guid: string;
  token: string;
  shortCode: string;
  shortUrl: string | null;
  expiresAt: Date;
}

export interface ShareLinkSigningRow {
  guid: string;
  orgId: string;
  linkKind: string;
  subjectGuid: string;
  subjectVersion: number;
  purpose: string;
  showsPrices: boolean;
  requiresGuestContact: boolean;
  issuedAt: Date;
  expiresAt: Date;
}

export interface RevokedShareLink {
  kind: ShareLinkKind;
  subjectGuid: string;
}

export interface VerifiedShareToken {
  subjectGuid: string;
  orgId: string;
  version: number;
  expiresAt: Date;
  issuedAt: Date;
  showsPrices: boolean;
  requiresGuestContact: boolean;
  purpose: ShareLinkPurpose;
  linkGuid: string | null;
}

export interface StorageShareLinkClaims {
  locationGuid: string;
  locationId: number;
  orgId: string;
  locationName: string;
  expiresAt: Date;
  showsPrices: boolean;
  requiresGuestContact: boolean;
  purpose: ShareLinkPurpose;
}

export interface CardShareLinkClaims {
  linkGuid: string;
  collectionCardId: number;
  scanId: string;
  collectionId: number;
  cardName: string;
  orgId: string;
  showsPrices: boolean;
}

export interface ShareLinkRequestBody {
  expiresInDays?: number;
  showPrices?: unknown;
  requireGuestContact?: unknown;
  purpose?: unknown;
}

export type RevocableShareTokenSignInput = Pick<
  ShareTokenSignInput,
  "issuer" | "subjectGuid" | "orgId" | "version"
>;

export type VerifiedRevocableShareToken = Pick<
  VerifiedShareToken,
  "subjectGuid" | "orgId" | "version"
>;

export interface ShopCatalogClaims {
  catalogGuid: string;
  catalogId: number;
  orgId: string;
  name: string;
  collectionIds: number[];
  storageLocationIds: number[];
  showsPrices: boolean;
}

export interface ShareLinkLifetime {
  expiresAt: Date;
}
