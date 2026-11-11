import type { ShareLinkPurpose } from "@magic-vault/shared";
export interface MonitorLinkClaims {
  collectionGuid: string;
  collectionId: number;
  orgId: string;
  collectionName: string;
  expiresAt: Date;
  showsPrices: boolean;
  purpose: ShareLinkPurpose;
}
