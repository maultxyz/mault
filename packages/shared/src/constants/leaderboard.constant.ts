export const LEADERBOARD_SIZE = 10;
export const LEADERBOARD_METRICS = ["totalScans", "cardsPerHour"] as const;
export const DEFAULT_LEADERBOARD_METRIC = "totalScans";
export const LEADERBOARD_METRIC_PARAM = "metric";
export const LEADERBOARD_PERIODS = ["allTime", "week", "month", "year"] as const;
export const DEFAULT_LEADERBOARD_PERIOD = "allTime";
export const LEADERBOARD_PERIOD_PARAM = "period";
export const LEADERBOARD_PERIOD_DAYS = { week: 7, month: 30, year: 365 } as const;
