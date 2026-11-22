import {
  LEADERBOARD_SIZE,
  leaderboardMetricCountsSelfHosted,
} from "@magic-vault/shared";
import { Hono } from "hono";
import {
  loadLeaderboard,
  loadTopLeaderboardEntries,
  parseLeaderboardQuery,
  publicLeaderboardRows,
} from "../../lib/leaderboard";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

export const botLeaderboardRoute = new Hono<AppEnv>().get(
  "/leaderboard",
  async (c) => {
    const guildId = c.req.query("guildId");
    const orgId = guildId ? await resolveOrgByGuild(guildId) : null;
    const query = parseLeaderboardQuery((name) => c.req.query(name));
    const includesSelfHosted =
      query.includeSelfHosted && leaderboardMetricCountsSelfHosted(query.metric);
    const leaderboardDetails = {
      size: LEADERBOARD_SIZE,
      metric: query.metric,
      period: query.period,
      includesSelfHosted,
    };

    if (!orgId) {
      return c.json({
        success: true,
        data: {
          rows: await loadTopLeaderboardEntries(query),
          ...leaderboardDetails,
          linkedOrgOptedIn: null,
        },
      });
    }

    const leaderboard = await loadLeaderboard(orgId, query);
    return c.json({
      success: true,
      data: {
        rows: publicLeaderboardRows(leaderboard),
        ...leaderboardDetails,
        linkedOrgOptedIn: leaderboard.optedIn,
      },
    });
  },
);
