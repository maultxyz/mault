export interface MonitorLinkClaims {
  collectionGuid: string;
  collectionId: number;
  orgId: string;
  collectionName: string;
  expiresAt: Date;
  showsPrices: boolean;
  holdMinutes: number | null;
}
