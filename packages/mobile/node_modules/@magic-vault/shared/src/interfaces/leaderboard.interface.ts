export interface LeaderboardEntry {
  rank: number;
  name: string | null;
  scanCount: number;
  isOwnOrg: boolean;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  ownEntry: LeaderboardEntry;
  optedIn: boolean;
}
