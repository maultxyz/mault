import type {
  LEADERBOARD_METRICS,
  LEADERBOARD_PERIODS,
} from "../constants/leaderboard.constant";

export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number];
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

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
  metric?: LeaderboardMetric;
  period?: LeaderboardPeriod;
}

export interface LeaderboardQuery {
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  includeSelfHosted: boolean;
}

export interface LeaderboardRow {
  key: string;
  entry: LeaderboardEntry;
}
