export interface ShareTokenSignInput {
  issuer: string;
  subjectGuid: string;
  orgId: string;
  version: number;
  expiresInDays: number;
  showsPrices: boolean;
  holdMinutes: number | null;
}

export interface SignedShareToken {
  token: string;
  expiresAt: Date;
}

export interface VerifiedShareToken {
  subjectGuid: string;
  orgId: string;
  version: number;
  expiresAt: Date;
  showsPrices: boolean;
  holdMinutes: number | null;
}

export interface StorageShareLinkClaims {
  locationGuid: string;
  locationId: number;
  orgId: string;
  locationName: string;
  expiresAt: Date;
  showsPrices: boolean;
  holdMinutes: number | null;
}

export interface ShareLinkRequestBody {
  expiresInDays?: number;
  showPrices?: unknown;
  holdMinutes?: unknown;
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
