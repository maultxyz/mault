import { LEADERBOARD_OWN_ORG_AFTER } from "./constants/leaderboard.constant";
import type { Leaderboard, LeaderboardRow } from "./interfaces/leaderboard.interface";

export function buildLeaderboardRows(leaderboard: Leaderboard): LeaderboardRow[] {
  const rows = leaderboard.entries.map((entry, index) => ({
    key: `entry-${index}`,
    entry,
  }));
  if (leaderboard.entries.some((entry) => entry.isOwnOrg)) return rows;
  const own = { key: "own", entry: leaderboard.ownEntry };
  return [
    ...rows.slice(0, LEADERBOARD_OWN_ORG_AFTER),
    own,
    ...rows.slice(LEADERBOARD_OWN_ORG_AFTER),
  ];
}
