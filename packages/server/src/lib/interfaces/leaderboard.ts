export interface OrgScanCount {
  orgId: string;
  scanCount: number;
  selfHostedScanCount: number;
}

export type StoredOrgScanCount = [
  orgId: string,
  scanCount: number,
  selfHostedScanCount: number,
];

export interface CachedLeaderboardRanking {
  day: string;
  ranked: OrgScanCount[];
}
