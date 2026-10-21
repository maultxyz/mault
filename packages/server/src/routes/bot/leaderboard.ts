import { LEADERBOARD_SIZE } from "@magic-vault/shared";
import { Hono } from "hono";
import {
  loadLeaderboard,
  loadTopLeaderboardEntries,
  publicLeaderboardRows,
} from "../../lib/leaderboard";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

export const botLeaderboardRoute = new Hono<AppEnv>().get(
  "/leaderboard",
  async (c) => {
    const guildId = c.req.query("guildId");
    const orgId = guildId ? await resolveOrgByGuild(guildId) : null;

    if (!orgId) {
      return c.json({
        success: true,
        data: {
          rows: await loadTopLeaderboardEntries(),
          size: LEADERBOARD_SIZE,
          linkedOrgOptedIn: null,
        },
      });
    }

    const leaderboard = await loadLeaderboard(orgId);
    return c.json({
      success: true,
      data: {
        rows: publicLeaderboardRows(leaderboard),
        size: LEADERBOARD_SIZE,
        linkedOrgOptedIn: leaderboard.optedIn,
      },
    });
  },
);
