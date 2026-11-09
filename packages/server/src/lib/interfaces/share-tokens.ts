export interface ShareTokenSignInput {
  issuer: string;
  subjectGuid: string;
  orgId: string;
  version: number;
  expiresInDays: number;
  showsPrices: boolean;
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
}

export interface StorageShareLinkClaims {
  locationGuid: string;
  locationId: number;
  orgId: string;
  locationName: string;
  expiresAt: Date;
  showsPrices: boolean;
}
