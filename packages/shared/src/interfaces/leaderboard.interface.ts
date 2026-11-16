export interface LeaderboardEntry {
  rank: number;
  name: string | null;
  scanCount: number;
  isOwnOrg: boolean;
  isAnonymous: boolean;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  ownEntry: LeaderboardEntry;
  optedIn: boolean;
}

export interface LeaderboardRow {
  key: string;
  entry: LeaderboardEntry;
}
