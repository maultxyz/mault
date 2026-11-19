export interface LeaderboardEntry {
  rank: number;
  name: string | null;
  scanCount: number;
  isOwnOrg: boolean;
  isAnonymous: boolean;
  selfHostedScanCount: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  ownEntry: LeaderboardEntry;
  optedIn: boolean;
  includesSelfHosted: boolean;
}

export interface LeaderboardRow {
  key: string;
  entry: LeaderboardEntry;
}
